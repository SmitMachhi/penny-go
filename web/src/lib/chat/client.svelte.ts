import { refreshArtifactsUntilReady } from '$lib/chat/client-artifact-refresh.js';
import { applyLoadedArtifacts, snapshotArtifactVersions, syncChangedLatestArtifact, type ArtifactVersionSnapshot } from '$lib/chat/client-artifact-state.js';
import { abortChatRun, fetchArtifacts, fetchHealth, sendChatMessage } from '$lib/chat/client-api.js';
import { countUserMessages, hasPendingReply } from '$lib/chat/client-thread-reconcile.js';
import { fetchHistoryWithRetry } from '$lib/chat/history-fetch-retry.js';
import {
	appendAssistantMessage,
	appendUserMessage,
	applyCachedSessionThread,
	clearChatSessionState,
	createInitialChatState,
	prepareSessionSwitchState,
	resetRunState,
	startRunState,
	type ChatClientState
} from '$lib/chat/client-state.js';
import { stripTrailingAssistantMessages } from '$lib/chat/display-messages.js';
import { finalizeRunTrace } from '$lib/chat/client-run-trace.js';
import {
	findCompletedAssistantAfterLastUser,
	RUN_RECOVERY_POLL_MS
} from '$lib/chat/client-run-recovery.js';
import {
	clearRunResumeHint,
	readRunResumeHint,
	writeRunResumeHint
} from '$lib/chat/run-resume-hint.js';
import { createChatStreamConnection, type ChatStreamConnection } from '$lib/chat/client-stream-connection.js';
import { applyStreamEvent } from '$lib/chat/client-stream-events.js';
import { formatClientError } from '$lib/chat/format-error.js';
import { readSessionThreadCache, writeSessionThreadCache } from '$lib/chat/session-thread-cache.js';
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
	private abortRequested = false;

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
		void this.abortRunBeforeSessionReset();
		if (requestId !== this.historyRequestId) {
			return;
		}
		this.dispose();
		clearChatSessionState(this.state);
		this.activeRunId = null;
		this.abortRequested = false;
		this.artifactVersionSnapshot = new Map();
		this.pendingRunArtifactIds = [];
	}

	openArtifact(artifactId: string): void {
		this.state.activeArtifactId = artifactId;
		this.state.artifactPanelOpen = true;
		this.state.artifactPanelDismissed = false;
		if (this.state.sessionKey) {
			void this.loadArtifacts();
		}
		this.persistActiveSessionCache();
	}

	closeArtifactPanel(): void {
		this.state.artifactPanelOpen = false;
		this.state.artifactPanelDismissed = true;
		this.persistActiveSessionCache();
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
			if (this.state.artifacts.length === 0) {
				void this.loadArtifacts();
			}
			return;
		}
		if (this.state.sending) {
			void this.abortActiveRun();
		}
		this.persistActiveSessionCache();
		this.dispose();
		this.historyRequestId += 1;
		const cached = readSessionThreadCache(sessionKey);
		if (cached) {
			applyCachedSessionThread(this.state, sessionKey, cached);
		} else {
			prepareSessionSwitchState(this.state, sessionKey);
			this.state.loading = true;
		}
		this.activeRunId = null;
		this.abortRequested = false;
		this.artifactVersionSnapshot = new Map();
		this.pendingRunArtifactIds = [];
		this.connectStream();
		void this.loadHistory();
		void this.loadArtifacts();
	}

	async loadHistory(): Promise<void> {
		if (!this.state.sessionKey) {
			return;
		}
		const sessionKey = this.state.sessionKey;
		const requestId = ++this.historyRequestId;
		const showBlockingLoad = this.state.messages.length === 0;
		if (showBlockingLoad) {
			this.state.loading = true;
		} else {
			this.state.historyRefreshing = true;
		}
		try {
			const payload = await fetchHistoryWithRetry(sessionKey, {
				isCancelled: () =>
					requestId !== this.historyRequestId || sessionKey !== this.state.sessionKey
			});
			if (requestId !== this.historyRequestId || sessionKey !== this.state.sessionKey) {
				return;
			}
			const localUserCount = this.state.messages.filter((entry) => entry.role === 'user').length;
			const remoteUserCount = countUserMessages(payload.messages);
			if (localUserCount <= remoteUserCount) {
				this.state.messages = payload.messages;
			}
			this.state.sessionId = payload.sessionId ?? null;
			this.state.operationError = null;
			this.reconcileThreadAfterHistory(payload.messages, sessionKey);
			this.persistActiveSessionCache();
		} catch (error) {
			if (requestId !== this.historyRequestId || sessionKey !== this.state.sessionKey) {
				return;
			}
			this.state.operationError = formatClientError(error, 'failed to load chat history');
		} finally {
			if (requestId === this.historyRequestId && sessionKey === this.state.sessionKey) {
				this.state.loading = false;
				this.state.historyRefreshing = false;
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
			this.persistActiveSessionCache();
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
		const userMessageCount = countUserMessages(previousMessages);
		const expectedUserMessageCount = userMessageCount + 1;
		startRunState(this.state);
		this.activeRunId = null;
		this.expectedUserMessageCount = expectedUserMessageCount;
		this.artifactVersionSnapshot = snapshotArtifactVersions(this.state.artifacts);
		this.pendingRunArtifactIds = [];
		appendUserMessage(this.state, trimmed);
		this.persistActiveSessionCache();
		try {
			const payload = await sendChatMessage({ message: trimmed, sessionKey, sessionId });
			if (this.abortRequested) {
				this.activeRunId = payload.runId;
				void this.persistAbort(payload.runId);
				return true;
			}
			if (this.state.sending) {
				this.activeRunId = payload.runId;
				writeRunResumeHint({
					sessionKey,
					runId: payload.runId,
					startedAt: Date.now()
				});
				this.scheduleRunRecovery(expectedUserMessageCount);
			}
			return true;
		} catch (error) {
			this.clearRunRecovery();
			this.state.messages = previousMessages;
			this.state.sending = false;
			this.abortRequested = false;
			this.expectedUserMessageCount = 0;
			this.state.operationError = formatClientError(error, 'failed to send message');
			this.persistActiveSessionCache();
			return false;
		}
	}

	async abortActiveRun(): Promise<void> {
		if (!this.state.sending && !this.activeRunId) {
			return;
		}
		const runId = this.activeRunId;
		this.abortRequested = true;
		this.applyOptimisticAbort();
		if (runId && this.state.sessionKey) {
			this.abortRequested = false;
			void this.persistAbort(runId);
		}
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

	private reconcileActiveRunId(payload: SsePayload): void {
		if (payload.type === 'connected' || !('runId' in payload) || !payload.runId) {
			return;
		}
		if (!this.state.sending) {
			return;
		}
		if (this.activeRunId === null) {
			this.activeRunId = payload.runId;
			return;
		}
		if (this.activeRunId !== payload.runId) {
			this.activeRunId = payload.runId;
		}
	}

	private handleStreamEvent(payload: SsePayload): void {
		this.reconcileActiveRunId(payload);
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
		const artifactVersionSnapshot = this.artifactVersionSnapshot;
		const pendingRunArtifactIds = [...this.pendingRunArtifactIds];
		const thinkingTrace = finalizeRunTrace(this.state.runTrace, payload.text);
		this.state.messages = stripTrailingAssistantMessages(this.state.messages);
		appendAssistantMessage(this.state, payload.text, pendingRunArtifactIds, { thinkingTrace });
		this.state.operationError = null;
		this.resetRun();
		this.persistActiveSessionCache();
		void this.loadArtifacts().then(() => {
			if (sessionKey !== this.state.sessionKey) {
				return;
			}
				if (runId !== null && this.activeRunId !== null && this.activeRunId !== runId) {
					return;
				}
				syncChangedLatestArtifact(this.state, pendingRunArtifactIds, artifactVersionSnapshot);
				this.persistActiveSessionCache();
			});
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
		this.abortRequested = false;
		this.expectedUserMessageCount = 0;
		clearRunResumeHint(this.state.sessionKey);
		this.artifactVersionSnapshot = new Map();
		this.pendingRunArtifactIds = [];
		this.persistActiveSessionCache();
	}

	private applyOptimisticAbort(): void {
		this.clearRunRecovery();
		resetRunState(this.state);
		this.activeRunId = null;
		this.expectedUserMessageCount = 0;
		clearRunResumeHint(this.state.sessionKey);
		this.artifactVersionSnapshot = new Map();
		this.pendingRunArtifactIds = [];
		this.persistActiveSessionCache();
	}

	private async persistAbort(runId: string): Promise<void> {
		const sessionKey = this.state.sessionKey;
		if (!sessionKey) {
			return;
		}
		try {
			await abortChatRun({ sessionKey, runId });
		} catch (error) {
			this.state.operationError = formatClientError(error, 'failed to stop response');
		}
	}

	private persistActiveSessionCache(): void {
		if (!this.state.sessionKey) {
			return;
		}
		writeSessionThreadCache(this.state.sessionKey, {
			sessionId: this.state.sessionId,
			messages: this.state.messages,
			artifacts: this.state.artifacts,
			activeArtifactId: this.state.activeArtifactId,
			artifactPanelOpen: this.state.artifactPanelOpen,
			artifactPanelDismissed: this.state.artifactPanelDismissed
		});
	}

	private scheduleRunRecovery(expectedUserMessageCount: number): void {
		this.clearRunRecovery();
		if (!this.state.sending || expectedUserMessageCount < 1) {
			return;
		}
		this.runRecoveryTimer = setTimeout(() => {
			void this.tryRecoverRunFromHistory(expectedUserMessageCount);
		}, RUN_RECOVERY_POLL_MS);
	}

	private reconcileThreadAfterHistory(
		messages: ChatClientState['messages'],
		sessionKey: string
	): void {
		const hint = readRunResumeHint(sessionKey);
		const userCount = countUserMessages(messages);

		if (hasPendingReply(messages)) {
			if (!this.state.sending) {
				startRunState(this.state);
				this.activeRunId = hint?.runId ?? null;
			} else if (hint?.runId && this.activeRunId === null) {
				this.activeRunId = hint.runId;
			}
			this.expectedUserMessageCount = userCount;
			this.scheduleRunRecovery(userCount);
			return;
		}

		if (userCount === 0 && hint) {
			if (!this.state.sending) {
				startRunState(this.state);
				this.activeRunId = hint.runId;
			}
			this.expectedUserMessageCount = 1;
			this.scheduleRunRecovery(1);
			return;
		}

		clearRunResumeHint(sessionKey);
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
			const payload = await fetchHistoryWithRetry(sessionKey, { retryDelaysMs: [0, 0, 0, 0] });
			if (!this.state.sending || sessionKey !== this.state.sessionKey) {
				return;
			}
			const historyUserCount = countUserMessages(payload.messages);
			if (historyUserCount < expectedUserMessageCount) {
				this.scheduleRunRecovery(expectedUserMessageCount);
				return;
			}
			const assistant = findCompletedAssistantAfterLastUser(payload.messages);
			if (!assistant) {
				const localUserCount = countUserMessages(this.state.messages);
				if (localUserCount < historyUserCount) {
					this.state.messages = payload.messages;
					this.persistActiveSessionCache();
				}
				this.scheduleRunRecovery(expectedUserMessageCount);
				return;
			}
			const localUserCount = countUserMessages(this.state.messages);
			if (localUserCount <= historyUserCount) {
				this.state.messages = payload.messages;
			} else {
				this.state.messages = stripTrailingAssistantMessages(this.state.messages);
				appendAssistantMessage(this.state, assistant.text, assistant.artifactIds ?? [], {});
			}
			this.state.operationError = null;
			this.resetRun();
			this.persistActiveSessionCache();
			void this.loadArtifacts();
		} catch {
			if (this.state.sending) {
				this.scheduleRunRecovery(expectedUserMessageCount);
			}
		}
	}

	private async abortRunBeforeSessionReset(): Promise<void> {
		if (!this.activeRunId || !this.state.sessionKey) {
			if (this.state.sending) {
				this.applyOptimisticAbort();
			}
			return;
		}
		const runId = this.activeRunId;
		this.applyOptimisticAbort();
		try {
			await abortChatRun({ sessionKey: this.state.sessionKey, runId });
		} catch (error) {
			this.state.operationError = formatClientError(error, 'failed to abort active run');
		}
	}
}
