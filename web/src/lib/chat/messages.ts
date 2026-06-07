export type ChatRole = 'user' | 'assistant' | 'system';

export type AssistantPhase = 'commentary' | 'final_answer';

export type ChatMessage = {
	id: string;
	role: ChatRole;
	text: string;
	timestamp?: number;
	phase?: AssistantPhase;
	artifactIds?: string[];
	thinkingTrace?: string;
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

const TOOL_CALL_BLOCK_TYPE = 'toolCall';
const TOOL_USE_STOP_REASON = 'toolUse';

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

function normalizeAssistantPhase(value: unknown): AssistantPhase | undefined {
	return value === 'commentary' || value === 'final_answer' ? value : undefined;
}

function parseAssistantTextSignature(value: unknown): { phase?: AssistantPhase } | null {
	if (typeof value !== 'string' || value.trim().length === 0) {
		return null;
	}
	if (!value.startsWith('{')) {
		return null;
	}
	try {
		const parsed = JSON.parse(value) as { phase?: unknown; v?: unknown };
		if (parsed.v !== 1) {
			return null;
		}
		const phase = normalizeAssistantPhase(parsed.phase);
		return phase ? { phase } : null;
	} catch {
		return null;
	}
}

function hasToolCallBlock(content: unknown): boolean {
	if (!Array.isArray(content)) {
		return false;
	}
	return content.some((block) => {
		if (!block || typeof block !== 'object') {
			return false;
		}
		const record = block as { type?: unknown };
		return record.type === TOOL_CALL_BLOCK_TYPE;
	});
}

export function resolveAssistantMessagePhase(message: unknown): AssistantPhase | undefined {
	if (!message || typeof message !== 'object') {
		return undefined;
	}
	const entry = message as { phase?: unknown; content?: unknown; stopReason?: unknown };
	const directPhase = normalizeAssistantPhase(entry.phase);
	if (directPhase) {
		return directPhase;
	}
	const implicitToolUsePhase =
		entry.stopReason === TOOL_USE_STOP_REASON || hasToolCallBlock(entry.content)
			? 'commentary'
			: undefined;
	if (!Array.isArray(entry.content)) {
		return implicitToolUsePhase;
	}
	const explicitPhases = new Set<AssistantPhase>();
	for (const block of entry.content) {
		if (!block || typeof block !== 'object') {
			continue;
		}
		const record = block as { type?: unknown; textSignature?: unknown };
		if (record.type !== 'text') {
			continue;
		}
		const phase = parseAssistantTextSignature(record.textSignature)?.phase;
		if (phase) {
			explicitPhases.add(phase);
		}
	}
	return explicitPhases.size === 1 ? [...explicitPhases][0] : implicitToolUsePhase;
}

type ParsedHistoryMessage = {
	id: string;
	role: ChatRole;
	text: string;
	timestamp?: number;
	phase?: AssistantPhase;
};

function parseHistoryMessage(message: unknown, index: number): ParsedHistoryMessage | null {
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
		phase: role === 'assistant' ? resolveAssistantMessagePhase(message) : undefined,
		...(typeof record.timestamp === 'number' ? { timestamp: record.timestamp } : {})
	};
}

function coalesceAssistantGroup(group: ParsedHistoryMessage[]): ChatMessage[] {
	if (group.length === 0) {
		return [];
	}

	const finalIndex = group.findLastIndex((message) => message.phase === 'final_answer');
	const visibleIndex = finalIndex >= 0 ? finalIndex : group.length - 1;
	const visible = group[visibleIndex];
	if (!visible) {
		return [];
	}

	const traceParts = group
		.filter((_, index) => index !== visibleIndex)
		.map((message) => message.text)
		.filter((text) => text.trim().length > 0);

	return [
		{
			id: visible.id,
			role: 'assistant',
			text: visible.text,
			...(visible.phase ? { phase: visible.phase } : {}),
			...(visible.timestamp !== undefined ? { timestamp: visible.timestamp } : {}),
			...(traceParts.length > 0 ? { thinkingTrace: traceParts.join('\n\n') } : {})
		}
	];
}

export function normalizeHistoryMessages(rawMessages: unknown[]): ChatMessage[] {
	const parsed = rawMessages
		.map((message, index) => parseHistoryMessage(message, index))
		.filter((message): message is ParsedHistoryMessage => message !== null);

	const result: ChatMessage[] = [];
	let assistantGroup: ParsedHistoryMessage[] = [];

	const flushAssistantGroup = (): void => {
		result.push(...coalesceAssistantGroup(assistantGroup));
		assistantGroup = [];
	};

	for (const message of parsed) {
		if (message.role === 'assistant') {
			assistantGroup.push(message);
			continue;
		}
		flushAssistantGroup();
		result.push({
			id: message.id,
			role: message.role,
			text: message.text,
			...(message.timestamp !== undefined ? { timestamp: message.timestamp } : {})
		});
	}

	flushAssistantGroup();
	return result;
}

export { toolLabel } from './tool-presentations.js';
