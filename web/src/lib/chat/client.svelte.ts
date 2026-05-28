import type { ArtifactSummary, ArtifactsResponse } from '$lib/chat/artifacts.js';
import type { ChatMessage, ToolActivity } from '$lib/chat/messages.js';
import { apiJson } from '$lib/chat/api-client.js';
import { formatClientError } from '$lib/chat/format-error.js';
import type { SsePayload } from '$lib/chat/stream-events.js';

type HistoryResponse = {
	sessionKey: string;
	sessionId?: string;
	messages: ChatMessage[];
};

type SendResponse = {
	runId: string;
	sessionKey: string;
};

const CREATE_FUNDING_BRIEF_TOOL = 'create_funding_brief';
const ARTIFACT_REFRESH_MAX_ATTEMPTS = 3;
const ARTIFACT_REFRESH_DELAY_MS = 150;

export type ChatClientState = {
	connected: boolean;
	loading: boolean;
	sending: boolean;
	sessionKey: string;
	sessionId: string | null;
	messages: ChatMessage[];
	streamText: string;
	tools: ToolActivity[];
	artifacts: ArtifactSummary[];
	artifactPanelOpen: boolean;
	activeArtifactId: string | null;
	error: string | null;
};

export function createInitialChatState(): ChatClientState {
	return {
		connected: false,
		loading: true,
		sending: false,
		sessionKey: '',
		sessionId: null,
		messages: [],
		streamText: '',
		tools: [],
		artifacts: [],
		artifactPanelOpen: false,
		activeArtifactId: null,
		error: null
	};
}

export class ChatClient {
	state = $state<ChatClientState>(createInitialChatState());
	private eventSource: EventSource | null = null;
	private activeRunId: string | null = null;
	private pendingRunArtifactIds: string[] = [];
	private historyRequestId = 0;

	async bootstrap(): Promise<void> {
		await this.refreshHealth();
	}

	dispose(): void {
		this.eventSource?.close();
		this.eventSource = null;
	}

	async clearSession(): Promise<void> {
		const requestId = ++this.historyRequestId;
		await this.abortRunBeforeSessionReset();
		if (requestId !== this.historyRequestId) {
			return;
		}
		this.dispose();
		this.state.sessionKey = '';
		this.state.sessionId = null;
		this.state.messages = [];
		this.state.streamText = '';
		this.state.tools = [];
		this.state.artifacts = [];
		this.state.artifactPanelOpen = false;
		this.state.activeArtifactId = null;
		this.state.sending = false;
		this.state.loading = false;
		this.activeRunId = null;
		this.pendingRunArtifactIds = [];
	}

	openArtifact(artifactId: string): void {
		this.state.activeArtifactId = artifactId;
		this.state.artifactPanelOpen = true;
	}

	closeArtifactPanel(): void {
		this.state.artifactPanelOpen = false;
	}

	async refreshHealth(): Promise<void> {
		try {
			const payload = await apiJson<{ ok?: boolean; message?: string }>('/api/health');
			this.state.connected = payload.ok === true;
			if (!this.state.connected) {
				this.state.error = payload.message ?? 'OpenClaw gateway is unavailable';
			}
		} catch (error) {
			this.state.connected = false;
			this.state.error = formatClientError(error, 'OpenClaw gateway is unavailable');
		}
	}

	async switchSession(sessionKey: string): Promise<void> {
		if (this.state.sessionKey === sessionKey) {
			return;
		}
		if (this.state.sending) {
			await this.abortActiveRun();
		}

		this.dispose();
		this.historyRequestId += 1;
		this.state.sessionKey = sessionKey;
		this.state.sessionId = null;
		this.state.messages = [];
		this.state.streamText = '';
		this.state.tools = [];
		this.state.artifacts = [];
		this.state.artifactPanelOpen = false;
		this.state.activeArtifactId = null;
		this.state.error = null;
		this.activeRunId = null;
		this.pendingRunArtifactIds = [];

		await Promise.all([this.loadHistory(), this.loadArtifacts()]);
		this.connectStream();
	}

	async loadHistory(): Promise<void> {
		if (!this.state.sessionKey) {
			return;
		}

		const sessionKey = this.state.sessionKey;
		const requestId = ++this.historyRequestId;
		this.state.loading = true;
		try {
			const payload = await apiJson<HistoryResponse>(
				`/api/chat/history?sessionKey=${encodeURIComponent(sessionKey)}`
			);
			if (requestId !== this.historyRequestId || sessionKey !== this.state.sessionKey) {
				return;
			}
			this.state.messages = payload.messages;
			this.state.sessionId = payload.sessionId ?? null;
			this.state.error = null;
		} catch (error) {
			if (requestId !== this.historyRequestId || sessionKey !== this.state.sessionKey) {
				return;
			}
			this.state.error = formatClientError(error, 'failed to load chat history');
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

		try {
			const payload = await apiJson<ArtifactsResponse>(
				`/api/artifacts?sessionKey=${encodeURIComponent(this.state.sessionKey)}`
			);
			this.state.artifacts = payload.artifacts;
			this.state.error = null;
			if (!this.state.activeArtifactId && payload.artifacts[0]) {
				this.state.activeArtifactId = payload.artifacts[0].artifactId;
			}
		} catch (error) {
			this.state.error = formatClientError(error, 'failed to load artifacts');
		}
	}

	async sendMessage(message: string, options?: { skipHistoryReload?: boolean }): Promise<boolean> {
		const trimmed = message.trim();
		const sessionKey = this.state.sessionKey;
		if (!trimmed || this.state.sending || !sessionKey) {
			return false;
		}

		if (!options?.skipHistoryReload) {
			await this.loadHistory();
			if (this.state.error || this.state.sessionKey !== sessionKey) {
				return false;
			}
		}

		const sessionId = this.state.sessionId;
		this.state.sending = true;
		this.state.error = null;
		this.state.streamText = '';
		this.state.tools = [];
		this.pendingRunArtifactIds = [];
		this.state.messages = [
			...this.state.messages,
			{ id: crypto.randomUUID(), role: 'user', text: trimmed }
		];

		try {
			const payload = await apiJson<SendResponse>('/api/chat/send', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					message: trimmed,
					sessionKey,
					sessionId
				})
			});
			this.activeRunId = payload.runId;
			return true;
		} catch (error) {
			this.state.sending = false;
			this.state.error = formatClientError(error, 'failed to send message');
			return false;
		}
	}

	async abortActiveRun(): Promise<void> {
		if (!this.activeRunId || !this.state.sessionKey) {
			return;
		}
		await apiJson('/api/chat/abort', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ sessionKey: this.state.sessionKey, runId: this.activeRunId })
		});
	}

	private connectStream(): void {
		if (!this.state.sessionKey) {
			return;
		}

		this.eventSource?.close();
		const source = new EventSource(
			`/api/chat/stream?sessionKey=${encodeURIComponent(this.state.sessionKey)}`
		);
		this.eventSource = source;

		source.onmessage = (event) => {
			const payload = JSON.parse(event.data) as SsePayload;
			this.handleStreamEvent(payload);
		};

		source.onerror = () => {
			this.state.connected = false;
		};
	}

	private handleStreamEvent(payload: SsePayload): void {
		if (payload.type === 'connected') {
			this.state.connected = true;
			return;
		}

		if (this.activeRunId && 'runId' in payload && payload.runId !== this.activeRunId) {
			return;
		}

		switch (payload.type) {
			case 'chat.delta':
				this.state.streamText = payload.text;
				break;
			case 'tool.start':
				this.state.tools = upsertTool(this.state.tools, payload.name, 'running');
				break;
			case 'tool.done':
				this.state.tools = upsertTool(this.state.tools, payload.name, 'done');
				if (payload.name === CREATE_FUNDING_BRIEF_TOOL) {
					void this.refreshArtifactsAfterBrief();
				}
				break;
			case 'artifact.create':
			case 'artifact.update':
				this.upsertArtifact(payload.artifact);
				this.state.activeArtifactId = payload.artifact.artifactId;
				this.state.artifactPanelOpen = true;
				if (!this.pendingRunArtifactIds.includes(payload.artifact.artifactId)) {
					this.pendingRunArtifactIds.push(payload.artifact.artifactId);
				}
				break;
			case 'chat.final': {
				const text = payload.text || this.state.streamText;
				if (text.trim()) {
					const messageId = crypto.randomUUID();
					this.state.messages = [
						...this.state.messages,
						{
							id: messageId,
							role: 'assistant',
							text,
							...(this.pendingRunArtifactIds.length > 0
								? { artifactIds: [...this.pendingRunArtifactIds] }
								: {})
						}
					];
				}
				this.state.error = null;
				this.resetRun();
				break;
			}
			case 'chat.aborted':
				this.resetRun();
				break;
			case 'chat.error':
				this.state.error = payload.message;
				this.resetRun();
				break;
		}
	}

	private async refreshArtifactsAfterBrief(): Promise<void> {
		for (let attempt = 0; attempt < ARTIFACT_REFRESH_MAX_ATTEMPTS; attempt += 1) {
			await this.loadArtifacts();
			const latest = this.state.artifacts[0];
			if (latest) {
				this.state.activeArtifactId = latest.artifactId;
				this.state.artifactPanelOpen = true;
				if (!this.pendingRunArtifactIds.includes(latest.artifactId)) {
					this.pendingRunArtifactIds.push(latest.artifactId);
				}
				return;
			}

			await new Promise((resolve) => {
				setTimeout(resolve, ARTIFACT_REFRESH_DELAY_MS * (attempt + 1));
			});
		}
	}

	private upsertArtifact(artifact: ArtifactSummary): void {
		const existingIndex = this.state.artifacts.findIndex(
			(entry) => entry.artifactId === artifact.artifactId
		);
		if (existingIndex >= 0) {
			this.state.artifacts = this.state.artifacts.map((entry, index) =>
				index === existingIndex ? artifact : entry
			);
			return;
		}
		this.state.artifacts = [artifact, ...this.state.artifacts];
	}

	private resetRun(): void {
		this.state.sending = false;
		this.state.streamText = '';
		this.state.tools = [];
		this.activeRunId = null;
		this.pendingRunArtifactIds = [];
	}

	private async abortRunBeforeSessionReset(): Promise<void> {
		if (!this.activeRunId || !this.state.sessionKey) {
			return;
		}
		try {
			await this.abortActiveRun();
		} catch (error) {
			this.state.error = formatClientError(error, 'failed to abort active run');
		}
	}
}

function upsertTool(tools: ToolActivity[], name: string, phase: ToolActivity['phase']): ToolActivity[] {
	const existing = tools.find((tool) => tool.name === name);
	if (existing) {
		return tools.map((tool) => (tool.name === name ? { ...tool, phase } : tool));
	}
	return [...tools, { id: crypto.randomUUID(), name, phase }];
}
