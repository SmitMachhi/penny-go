import type { AgentEventPayload } from '$lib/gateway/types.js';

import {
	clearAllBufferedStreamText,
	clearBufferedStreamText,
	resolveBufferedStreamText
} from './stream-text-buffer.js';

const thinkingStreamText = new Map<string, string>();

export function resolveThinkingStreamText(payload: AgentEventPayload): string | null {
	const runId = payload.runId;
	if (!runId || payload.stream !== 'thinking') {
		return null;
	}

	return resolveBufferedStreamText(runId, payload.data, thinkingStreamText);
}

export function clearThinkingStreamText(runId: string): void {
	clearBufferedStreamText(runId, thinkingStreamText);
}

export function clearAllThinkingStreamText(): void {
	clearAllBufferedStreamText(thinkingStreamText);
}

export function resetThinkingStreamTextForTests(): void {
	thinkingStreamText.clear();
}
