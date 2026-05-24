import type { ChatMessage, ToolActivity } from '$lib/chat/messages.js';
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

export type ChatClientState = {
	connected: boolean;
	loading: boolean;
	sending: boolean;
	sessionKey: string;
	sessionId: string | null;
	messages: ChatMessage[];
	streamText: string;
	tools: ToolActivity[];
	error: string | null;
};

export function createInitialChatState(): ChatClientState {
	return {
		connected: false,
		loading: true,
		sending: false,
		sessionKey: 'agent:main:main',
		sessionId: null,
		messages: [],
		streamText: '',
		tools: [],
		error: null
	};
}

export class ChatClient {
	state = $state<ChatClientState>(createInitialChatState());
	private eventSource: EventSource | null = null;
	private activeRunId: string | null = null;

	async bootstrap(): Promise<void> {
		await this.refreshHealth();
		await this.loadHistory();
		this.connectStream();
	}

	dispose(): void {
		this.eventSource?.close();
		this.eventSource = null;
	}

	async refreshHealth(): Promise<void> {
		const response = await fetch('/api/health');
		const payload = (await response.json()) as { ok?: boolean; sessionKey?: string; message?: string };
		this.state.connected = response.ok && payload.ok === true;
		if (payload.sessionKey) {
			this.state.sessionKey = payload.sessionKey;
		}
		if (!this.state.connected) {
			this.state.error = payload.message ?? 'OpenClaw gateway is unavailable';
		}
	}

	async loadHistory(): Promise<void> {
		this.state.loading = true;
		try {
			const response = await fetch(`/api/chat/history?sessionKey=${encodeURIComponent(this.state.sessionKey)}`);
			const payload = (await response.json()) as HistoryResponse & { error?: string };
			if (!response.ok) {
				throw new Error(payload.error ?? 'failed to load chat history');
			}
			this.state.messages = payload.messages;
			this.state.sessionId = payload.sessionId ?? null;
			this.state.error = null;
		} catch (error) {
			this.state.error = error instanceof Error ? error.message : 'failed to load chat history';
		} finally {
			this.state.loading = false;
		}
	}

	async sendMessage(message: string): Promise<void> {
		const trimmed = message.trim();
		if (!trimmed || this.state.sending) {
			return;
		}

		this.state.sending = true;
		this.state.error = null;
		this.state.streamText = '';
		this.state.tools = [];
		this.state.messages = [
			...this.state.messages,
			{ id: crypto.randomUUID(), role: 'user', text: trimmed }
		];

		try {
			const response = await fetch('/api/chat/send', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					message: trimmed,
					sessionKey: this.state.sessionKey,
					sessionId: this.state.sessionId
				})
			});
			const payload = (await response.json()) as SendResponse & { error?: string };
			if (!response.ok) {
				throw new Error(payload.error ?? 'failed to send message');
			}
			this.activeRunId = payload.runId;
		} catch (error) {
			this.state.sending = false;
			this.state.error = error instanceof Error ? error.message : 'failed to send message';
		}
	}

	async abortActiveRun(): Promise<void> {
		if (!this.activeRunId) {
			return;
		}
		await fetch('/api/chat/abort', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ sessionKey: this.state.sessionKey, runId: this.activeRunId })
		});
	}

	private connectStream(): void {
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
				break;
			case 'chat.final': {
				const text = payload.text || this.state.streamText;
				if (text.trim()) {
					this.state.messages = [
						...this.state.messages,
						{ id: crypto.randomUUID(), role: 'assistant', text }
					];
				}
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

	private resetRun(): void {
		this.state.sending = false;
		this.state.streamText = '';
		this.state.tools = [];
		this.activeRunId = null;
	}
}

function upsertTool(tools: ToolActivity[], name: string, phase: ToolActivity['phase']): ToolActivity[] {
	const existing = tools.find((tool) => tool.name === name);
	if (existing) {
		return tools.map((tool) => (tool.name === name ? { ...tool, phase } : tool));
	}
	return [...tools, { id: crypto.randomUUID(), name, phase }];
}
