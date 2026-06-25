import { createEmptyRunTrace, type RunTraceState } from '$lib/chat/client-run-trace.js';
import {
	extractMessageText,
	resolveAssistantMessagePhase,
	type AssistantPhase,
	type ChatMessage,
	type ToolActivity
} from '$lib/chat/messages.js';

const TOOL_CALL_BLOCK_TYPE = 'toolCall';

type RawRecord = Record<string, unknown>;

export type ActiveRunProgress = {
	tools: ToolActivity[];
	runTrace: RunTraceState;
	streamingAnswerText: string;
	inProgressMessages: ChatMessage[];
};

type ParsedTurnEntry = {
	role: 'assistant' | 'toolResult' | 'user';
	text: string;
	phase?: AssistantPhase;
	toolCallId: string | null;
	toolName: string | null;
};

function isRecord(value: unknown): value is RawRecord {
	return value !== null && typeof value === 'object';
}

function messageRecord(raw: unknown): RawRecord | null {
	if (!isRecord(raw)) {
		return null;
	}
	const nested = raw.message;
	return isRecord(nested) ? nested : raw;
}

function readString(value: unknown): string | null {
	return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function toolNameFromBlock(block: RawRecord): string | null {
	return readString(block.toolName) ?? readString(block.name);
}

function toolCallIdFromBlock(block: RawRecord): string | null {
	return readString(block.toolCallId);
}

function parseTurnEntry(raw: unknown): ParsedTurnEntry | null {
	const record = messageRecord(raw);
	if (!record) {
		return null;
	}
	const role = readString(record.role);
	if (role === 'user') {
		const text = extractMessageText(record).trim();
		return text ? { role: 'user', text, toolCallId: null, toolName: null } : null;
	}
	if (role === 'toolResult') {
		return {
			role: 'toolResult',
			text: extractMessageText(record).trim(),
			toolCallId: readString(record.toolCallId),
			toolName: readString(record.toolName) ?? readString(record.name),
			phase: undefined
		};
	}
	if (role !== 'assistant') {
		return null;
	}
	const content = record.content;
	let toolCallId: string | null = null;
	let toolName: string | null = null;
	if (Array.isArray(content)) {
		for (const block of content) {
			if (!isRecord(block) || block.type !== TOOL_CALL_BLOCK_TYPE) {
				continue;
			}
			toolCallId = toolCallIdFromBlock(block) ?? toolCallId;
			toolName = toolNameFromBlock(block) ?? toolName;
		}
	}
	const text = extractMessageText(record).trim();
	const phase = resolveAssistantMessagePhase(record);
	if (!text && !toolName) {
		return null;
	}
	return { role: 'assistant', text, phase, toolCallId, toolName };
}

function findActiveUserIndex(rawMessages: readonly unknown[], userText: string): number {
	const trimmed = userText.trim();
	for (let index = rawMessages.length - 1; index >= 0; index -= 1) {
		const entry = parseTurnEntry(rawMessages[index]);
		if (entry?.role === 'user' && entry.text === trimmed) {
			return index;
		}
	}
	return -1;
}

function upsertToolState(
	tools: ToolActivity[],
	toolName: string,
	phase: ToolActivity['phase']
): ToolActivity[] {
	const existing = tools.find((tool) => tool.name === toolName);
	if (existing) {
		return tools.map((tool) => (tool.name === toolName ? { ...tool, phase } : tool));
	}
	return [...tools, { id: crypto.randomUUID(), name: toolName, phase }];
}

function buildTools(entries: readonly ParsedTurnEntry[]): ToolActivity[] {
	const pendingByCallId = new Map<string, string>();
	let tools: ToolActivity[] = [];
	for (const entry of entries) {
		if (entry.role === 'assistant' && entry.toolName) {
			if (entry.toolCallId) {
				pendingByCallId.set(entry.toolCallId, entry.toolName);
			}
			tools = upsertToolState(tools, entry.toolName, 'running');
			continue;
		}
		if (entry.role !== 'toolResult') {
			continue;
		}
		const toolName =
			entry.toolName ??
			(entry.toolCallId ? pendingByCallId.get(entry.toolCallId) : null) ??
			'unknown_tool';
		tools = upsertToolState(tools, toolName, 'done');
	}
	return tools;
}

function buildRunTrace(entries: readonly ParsedTurnEntry[]): RunTraceState {
	const trace = createEmptyRunTrace();
	const commentary: string[] = [];
	for (const entry of entries) {
		if (entry.role !== 'assistant' || !entry.text.trim()) {
			continue;
		}
		if (entry.phase === 'final_answer') {
			trace.liveSegment = entry.text;
			continue;
		}
		commentary.push(entry.text);
	}
	if (commentary.length > 0) {
		trace.segments = commentary.slice(0, -1);
		trace.liveSegment = commentary.at(-1) ?? '';
	}
	return trace;
}

function buildInProgressMessages(entries: readonly ParsedTurnEntry[]): ChatMessage[] {
	const messages: ChatMessage[] = [];
	for (const [index, entry] of entries.entries()) {
		if (entry.role !== 'assistant' || !entry.text.trim() || entry.phase === 'final_answer') {
			continue;
		}
		messages.push({
			id: `active-progress-${index}`,
			role: 'assistant',
			text: entry.text,
			...(entry.phase ? { phase: entry.phase } : { phase: 'commentary' })
		});
	}
	return messages;
}

export function extractActiveRunProgress(
	rawMessages: readonly unknown[],
	activeUserMessage: string
): ActiveRunProgress | null {
	const userIndex = findActiveUserIndex(rawMessages, activeUserMessage);
	if (userIndex === -1) {
		return null;
	}
	const entries = rawMessages
		.slice(userIndex + 1)
		.map(parseTurnEntry)
		.filter((entry): entry is ParsedTurnEntry => entry !== null);
	if (entries.length === 0) {
		return null;
	}
	const runTrace = buildRunTrace(entries);
	return {
		tools: buildTools(entries),
		runTrace,
		streamingAnswerText: runTrace.liveSegment.trim(),
		inProgressMessages: buildInProgressMessages(entries)
	};
}

export function mergeMessagesForActiveTurn(
	baseMessages: readonly ChatMessage[],
	activeUserMessage: string,
	progress: ActiveRunProgress | null
): ChatMessage[] {
	if (!progress || progress.inProgressMessages.length === 0) {
		return [...baseMessages];
	}
	const trimmed = activeUserMessage.trim();
	const userIndex = baseMessages.findLastIndex(
		(message) => message.role === 'user' && message.text.trim() === trimmed
	);
	if (userIndex === -1) {
		return [...baseMessages, ...progress.inProgressMessages];
	}
	return [...baseMessages.slice(0, userIndex + 1), ...progress.inProgressMessages];
}
