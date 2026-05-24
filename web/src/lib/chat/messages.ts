export type ChatRole = 'user' | 'assistant' | 'system';

export type ChatMessage = {
	id: string;
	role: ChatRole;
	text: string;
	timestamp?: number;
};

export type ToolActivity = {
	id: string;
	name: string;
	phase: 'running' | 'done' | 'error';
};

export type StreamState = {
	runId: string | null;
	text: string;
	tools: ToolActivity[];
	status: 'idle' | 'streaming' | 'error';
	error: string | null;
};

export function extractMessageText(message: unknown): string {
	if (!message || typeof message !== 'object') {
		return '';
	}

	const record = message as Record<string, unknown>;
	if (typeof record.text === 'string') {
		return record.text;
	}

	const content = record.content;
	if (!Array.isArray(content)) {
		return '';
	}

	return content
		.map((part) => {
			if (!part || typeof part !== 'object') {
				return '';
			}
			const chunk = part as Record<string, unknown>;
			return typeof chunk.text === 'string' ? chunk.text : '';
		})
		.join('');
}

export function normalizeHistoryMessages(rawMessages: unknown[]): ChatMessage[] {
	return rawMessages
		.map((message, index) => {
			if (!message || typeof message !== 'object') {
				return null;
			}
			const record = message as Record<string, unknown>;
			const role = record.role;
			if (role !== 'user' && role !== 'assistant' && role !== 'system') {
				return null;
			}
			const text = extractMessageText(message).trim();
			if (!text) {
				return null;
			}
			return {
				id: `history-${index}`,
				role: role as ChatRole,
				text,
				...(typeof record.timestamp === 'number' ? { timestamp: record.timestamp } : {})
			} satisfies ChatMessage;
		})
		.filter((message): message is ChatMessage => message !== null);
}

export function toolLabel(name: string): string {
	switch (name) {
		case 'search_corpus':
			return 'Searching funding corpus';
		case 'read_official_source':
			return 'Verifying official source';
		case 'web_search':
			return 'Searching the web (Exa)';
		default:
			return name;
	}
}
