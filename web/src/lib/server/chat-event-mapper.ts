import { extractMessageText } from '$lib/chat/messages.js';
import type { SsePayload } from '$lib/chat/stream-events.js';
import type { AgentEventPayload, ChatEventPayload } from '$lib/gateway/types.js';
import { clearStreamingText, resolveStreamingText } from '$lib/server/chat-stream-text.js';

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
		clearStreamingText(runId);
		return { type: 'chat.final', runId, text: extractMessageText(payload.message) };
	}

	if (payload.state === 'error') {
		clearStreamingText(runId);
		return {
			type: 'chat.error',
			runId,
			message: payload.error ?? 'chat run failed'
		};
	}

	if (payload.state === 'aborted') {
		clearStreamingText(runId);
		return { type: 'chat.aborted', runId };
	}

	return null;
}

export function mapAgentEventToSse(payload: AgentEventPayload): SsePayload | null {
	const runId = payload.runId;
	const toolName = payload.data?.tool ?? payload.data?.name;
	if (!runId || !toolName) {
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
