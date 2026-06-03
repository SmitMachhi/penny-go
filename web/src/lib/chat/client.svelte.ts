import { refreshArtifactsUntilReady } from '$lib/chat/client-artifact-refresh.js';
import { applyLoadedArtifacts, snapshotArtifactVersions, syncChangedLatestArtifact, type ArtifactVersionSnapshot } from '$lib/chat/client-artifact-state.js';
import { abortChatRun, fetchArtifacts, fetchHealth, fetchHistory, sendChatMessage } from '$lib/chat/client-api.js';
import { appendAssistantMessage, appendUserMessage, clearChatSessionState, createInitialChatState, prepareSessionSwitchState, resetRunState, startRunState, type ChatClientState } from '$lib/chat/client-state.js';
import { stripTrailingAssistantMessages } from '$lib/chat/display-messages.js';
import { finalizeRunTrace } from '$lib/chat/client-run-trace.js';
import {
	findCompletedAssistantAfterLastUser,
	RUN_RECOVERY_POLL_MS
} from '$lib/chat/client-run-recovery.js';
import { createChatStreamConnection, type ChatStreamConnection } from '$lib/chat/client-stream-connection.js';
import { applyStreamEvent } from '$lib/chat/client-stream-events.js';
import { formatClientError } from '$lib/chat/format-error.js';
import type { SsePayload } from '$lib/chat/stream-events.js';

const HEALTH_POLL_MS = 30_000;
const GATEWAY_OFFLINE_MESSAGE = 'OpenClaw gateway is unavailable';

export class ChatClient {
	state = $state<ChatClientState>(createInitialChatState());
	private streamConnection: ChatStreamConnection | null = null;
	private activeRunId: string | null = null;
	private artifactVersionSnapshot: ArtifactVersionSnapshot = new Map();
	private pendingRunArtifactIds: string[] = [];
	private historyRequestId = 0;
	private healthPollTimer: ReturnType<typeof setInterval> | null = null;
	private runRecoveryTimer: ReturnType<typeof setTimeout> | null = null;
	private expectedUserMessageCount = 0;
	private onGatewayRecovered: (() => void) | null = null;

	async bootstrap(): Promise<void> {
		await this.refreshHealth();
	}

	dispose(): void {
		this.clearRunRecovery();
		this.streamConnection?.close();
		this.streamConnection = null;
	}

	ensureStreamConnected(): void {
		this.streamConnection?.ensureOpen();
	}

	startHealthPolling(onRecovered?: () => void): void {
		this.onGatewayRecovered = onRecovered ?? null;
		this.stopHealthPolling();
		this.healthPollTimer = setInterval(() => {
			if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
				return;
			}
			void this.refreshHealth();
		}, HEALTH_POLL_MS);
	}

	stopHealthPolling(): void {
		if (this.healthPollTimer) {
			clearInterval(this.healthPollTimer);
			this.healthPollTimer = null;
		}
	}

	async clearSession(): Promise<void> {
		const requestId = ++this.historyRequestId;
		await this.abortRunBeforeSessionReset();
		if (requestId !== this.historyRequestId) {
			return;
		}
		this.dispose();
		clearChatSessionState(this.state);
		this.activeRunId = null;
		this.artifactVersionSnapshot = new Map();
		this.pendingRunArtifactIds = [];
	}

	openArtifact(artifactId: string): void {
		this.state.activeArtifactId = artifactId;
		this.state.artifactPanelOpen = true;
		if (this.state.artifacts.length === 0 && this.state.sessionKey) {
			void this.loadArtifacts();
		}
	}

	closeArtifactPanel(): void {
		this.state.artifactPanelOpen = false;
	}

	toggleArtifactPanel(): void {
		if (this.state.artifactPanelOpen) {
			this.closeArtifactPanel();
			return;
		}

		const artifactId = this.state.activeArtifactId ?? this.state.artifacts[0]?.artifactId;
		if (artifactId) {
			this.openArtifact(artifactId);
		}
	}

	async refreshHealth(): Promise<void> {
		const wasConnected = this.state.connected;
		try {
			const payload = await fetchHealth();
			this.state.connected = payload.ok === true;
			if (this.state.connected) {
				this.state.connectionError = null;
				if (!wasConnected) {
					this.onGatewayRecovered?.();
				}
				this.ensureStreamConnected();
			} else {
				this.state.connectionError = payload.message ?? GATEWAY_OFFLINE_MESSAGE;
			}
		} catch (error) {
			this.state.connected = false;
			this.state.connectionError = formatClientError(error, GATEWAY_OFFLINE_MESSAGE);
		}
	}

	async switchSession(sessionKey: string): Promise<void> {
		if (this.state.sessionKey === sessionKey) {
			this.ensureStreamConnected();
			return;
		}
		if (this.state.sending) {
			await this.abortActiveRun();
		}
		this.dispose();
		this.historyRequestId += 1;
		prepareSessionSwitchState(this.state, sessionKey);
		this.activeRunId = null;
		this.artifactVersionSnapshot = new Map();
		this.pendingRunArtifactIds = [];
		await this.loadHistory();
		this.connectStream();
		void this.loadArtifacts();
	}

	async loadHistory(): Promise<void> {
		if (!this.state.sessionKey || this.state.sending) {
			return;
		}
		const sessionKey = this.state.sessionKey;
		const requestId = ++this.historyRequestId;
		this.state.loading = true;
		try {
			const payload = await fetchHistory(sessionKey);
			if (requestId !== this.historyRequestId || sessionKey !== this.state.sessionKey) {
				return;
			}
			this.state.messages = payload.messages;
			this.state.sessionId = payload.sessionId ?? null;
			this.state.operationError = null;
		} catch (error) {
			if (requestId !== this.historyRequestId || sessionKey !== this.state.sessionKey) {
				return;
			}
			this.state.operationError = formatClientError(error, 'failed to load chat history');
		} finally {
			if (requestId === this.historyRequestId && sessionKey === this.state.sessionKey) {
				this.state.loading = false;
			}
		}
	}

	async loadArtifacts(): Promise<void> {
		if (!this.state.sessionKey) {
			return;
		}
		const sessionKey = this.state.sessionKey;
		try {
			const payload = await fetchArtifacts(sessionKey);
			if (sessionKey !== this.state.sessionKey) {
				return;
			}
			applyLoadedArtifacts(this.state, payload.artifacts);
			this.state.operationError = null;
		} catch (error) {
			if (sessionKey !== this.state.sessionKey) {
				return;
			}
			this.state.operationError = formatClientError(error, 'failed to load artifacts');
		}
	}

	async sendMessage(message: string, options?: { skipHistoryReload?: boolean }): Promise<boolean> {
		const trimmed = message.trim();
		const sessionKey = this.state.sessionKey;
		if (!trimmed || this.state.sending || !sessionKey) {
			return false;
		}
		const needsHistoryReload = !options?.skipHistoryReload && !this.state.sessionId;
		if (needsHistoryReload) {
			await this.loadHistory();
			if (this.state.operationError || this.state.sessionKey !== sessionKey) {
				return false;
			}
		}
		this.ensureStreamConnected();
		const sessionId = this.state.sessionId;
		const previousMessages = this.state.messages;
		const userMessageCount = previousMessages.filter((entry) => entry.role === 'user').length;
		startRunState(this.state);
		this.activeRunId = null;
		this.artifactVersionSnapshot = snapshotArtifactVersions(this.state.artifacts);
		this.pendingRunArtifactIds = [];
		appendUserMessage(this.state, trimmed);
		try {
			const payload = await sendChatMessage({ message: trimmed, sessionKey, sessionId });
			if (this.state.sending) {
				this.activeRunId = payload.runId;
				this.expectedUserMessageCount = userMessageCount + 1;
				this.scheduleRunRecovery(this.expectedUserMessageCount);
			}
			return true;
		} catch (error) {
			this.clearRunRecovery();
			this.state.messages = previousMessages;
			this.state.sending = false;
			this.state.operationError = formatClientError(error, 'failed to send message');
			return false;
		}
	}

	async abortActiveRun(): Promise<void> {
		if (!this.activeRunId || !this.state.sessionKey) {
			return;
		}
		await abortChatRun({ sessionKey: this.state.sessionKey, runId: this.activeRunId });
	}

	private connectStream(): void {
		if (!this.state.sessionKey) {
			return;
		}
		this.streamConnection?.close();
		this.streamConnection = createChatStreamConnection(this.state.sessionKey, {
			onPayload: (payload) => this.handleStreamEvent(payload)
		});
	}

	private handleStreamEvent(payload: SsePayload): void {
		applyStreamEvent(payload, {
			activeRunId: this.activeRunId,
			finalizeAssistantMessage: (event) => this.finalizeAssistantMessage(event),
			pendingRunArtifactIds: this.pendingRunArtifactIds,
			refreshArtifactsAfterBrief: () => this.refreshArtifactsAfterBrief(),
			resetRun: () => this.resetRun(),
			state: this.state
		});
		if (this.state.sending && payload.type !== 'connected') {
			this.scheduleRunRecovery(this.expectedUserMessageCount);
		}
	}

	private async finalizeAssistantMessage(payload: Extract<SsePayload, { type: 'chat.final' }>): Promise<void> {
		const sessionKey = this.state.sessionKey;
		const runId = this.activeRunId;
		if (!sessionKey || (runId !== null && runId !== payload.runId)) {
			return;
		}
		await this.loadArtifacts();
		if (sessionKey !== this.state.sessionKey || (this.activeRunId !== null && this.activeRunId !== payload.runId)) {
			return;
		}
		syncChangedLatestArtifact(this.state, this.pendingRunArtifactIds, this.artifactVersionSnapshot);
		this.state.messages = stripTrailingAssistantMessages(this.state.messages);
		appendAssistantMessage(
			this.state,
			payload.text,
			this.pendingRunArtifactIds,
			{ thinkingTrace: finalizeRunTrace(this.state.runTrace, payload.text) }
		);
		this.state.operationError = null;
		this.resetRun();
	}

	private async refreshArtifactsAfterBrief(): Promise<void> {
		await refreshArtifactsUntilReady({
			hasArtifacts: () => this.state.artifacts[0] !== undefined,
			loadArtifacts: () => this.loadArtifacts(),
			syncLatestArtifact: () =>
				syncChangedLatestArtifact(this.state, this.pendingRunArtifactIds, this.artifactVersionSnapshot)
		});
	}

	private resetRun(): void {
		this.clearRunRecovery();
		resetRunState(this.state);
		this.activeRunId = null;
		this.artifactVersionSnapshot = new Map();
		this.pendingRunArtifactIds = [];
	}

	private scheduleRunRecovery(expectedUserMessageCount: number): void {
		this.clearRunRecovery();
		if (!this.state.sending) {
			return;
		}
		this.runRecoveryTimer = setTimeout(() => {
			void this.tryRecoverRunFromHistory(expectedUserMessageCount);
		}, RUN_RECOVERY_POLL_MS);
	}

	private clearRunRecovery(): void {
		if (this.runRecoveryTimer) {
			clearTimeout(this.runRecoveryTimer);
			this.runRecoveryTimer = null;
		}
	}

	private async tryRecoverRunFromHistory(expectedUserMessageCount: number): Promise<void> {
		if (!this.state.sending || !this.state.sessionKey) {
			return;
		}
		const sessionKey = this.state.sessionKey;
		try {
			const payload = await fetchHistory(sessionKey);
			if (!this.state.sending || sessionKey !== this.state.sessionKey) {
				return;
			}
			const historyUserCount = payload.messages.filter((entry) => entry.role === 'user').length;
			if (historyUserCount < expectedUserMessageCount) {
				this.scheduleRunRecovery(expectedUserMessageCount);
				return;
			}
			const assistant = findCompletedAssistantAfterLastUser(payload.messages);
			if (!assistant) {
				this.scheduleRunRecovery(expectedUserMessageCount);
				return;
			}
			await this.loadArtifacts();
			if (!this.state.sending || sessionKey !== this.state.sessionKey) {
				return;
			}
			this.state.messages = stripTrailingAssistantMessages(this.state.messages);
			appendAssistantMessage(this.state, assistant.text, assistant.artifactIds ?? [], {});
			this.state.operationError = null;
			this.resetRun();
		} catch {
			if (this.state.sending) {
				this.scheduleRunRecovery(expectedUserMessageCount);
			}
		}
	}

	private async abortRunBeforeSessionReset(): Promise<void> {
		if (!this.activeRunId || !this.state.sessionKey) {
			return;
		}
		try {
			await this.abortActiveRun();
		} catch (error) {
			this.state.operationError = formatClientError(error, 'failed to abort active run');
		}
	}
}
