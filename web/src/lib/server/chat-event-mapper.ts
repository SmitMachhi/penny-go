import { extractMessageText } from '$lib/chat/messages.js';
import type { SsePayload } from '$lib/chat/stream-events.js';
import type { AgentEventPayload, ChatEventPayload } from '$lib/gateway/types.js';
import {
	clearStreamingText,
	readStreamingText,
	resolveStreamingText
} from '$lib/server/chat-stream-text.js';
import { clearThinkingStreamText, resolveThinkingStreamText } from '$lib/server/chat-stream-thinking.js';

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object';
}

function messageHasToolCall(message: Record<string, unknown>): boolean {
	const content = message.content;
	if (!Array.isArray(content)) {
		return false;
	}
	return content.some((block) => isRecord(block) && block.type === 'toolCall');
}

function isToolUseAssistantMessage(message: unknown): boolean {
	if (!isRecord(message)) {
		return false;
	}
	return message.stopReason === 'toolUse' || messageHasToolCall(message);
}

export function mapChatEventToSse(payload: ChatEventPayload): SsePayload | null {
	const runId = payload.runId;
	if (!runId) {
		return null;
	}

	if (payload.state === 'delta') {
		const cumulative = resolveStreamingText(payload);
		if (!cumulative) {
			return null;
		}
		return {
			type: 'chat.delta',
			runId,
			text: cumulative,
			...(payload.replace ? { replace: true } : {})
		};
	}

	if (payload.state === 'final') {
		const finalText = extractMessageText(payload.message).trim() || readStreamingText(runId);
		clearStreamingText(runId);
		if (isToolUseAssistantMessage(payload.message)) {
			return finalText ? { type: 'chat.progress', runId, text: finalText } : null;
		}
		clearThinkingStreamText(runId);
		return { type: 'chat.final', runId, text: finalText };
	}

	if (payload.state === 'error') {
		clearStreamingText(runId);
		clearThinkingStreamText(runId);
		return {
			type: 'chat.error',
			runId,
			message: payload.error ?? 'chat run failed'
		};
	}

	if (payload.state === 'aborted') {
		clearStreamingText(runId);
		clearThinkingStreamText(runId);
		return { type: 'chat.aborted', runId };
	}

	return null;
}

export function mapAgentEventToSse(payload: AgentEventPayload): SsePayload | null {
	const runId = payload.runId;
	if (!runId) {
		return null;
	}

	if (payload.stream === 'thinking') {
		const text = resolveThinkingStreamText(payload);
		if (!text) {
			return null;
		}
		return {
			type: 'thinking.delta',
			runId,
			text,
			...(payload.data?.replace ? { replace: true } : {})
		};
	}

	if (payload.stream !== 'tool') {
		return null;
	}

	const toolName = payload.data?.tool ?? payload.data?.name;
	if (!toolName) {
		return null;
	}

	const phase = payload.data?.phase ?? payload.data?.status;
	const done = phase === 'done' || phase === 'completed' || phase === 'success';
	return {
		type: done ? 'tool.done' : 'tool.start',
		runId,
		name: toolName
	};
}
