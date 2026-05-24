import { extractMessageText } from '$lib/chat/messages.js';
import type { ChatEventPayload } from '$lib/gateway/types.js';

const runStreamText = new Map<string, string>();

export function resolveStreamingText(payload: ChatEventPayload): string | null {
	const runId = payload.runId;
	if (!runId) {
		return null;
	}

	const merged = extractMessageText(payload.message).trim();
	if (merged) {
		runStreamText.set(runId, merged);
		return merged;
	}

	if (typeof payload.deltaText !== 'string' || !payload.deltaText) {
		return null;
	}

	const prior = payload.replace ? '' : (runStreamText.get(runId) ?? '');
	const next = prior + payload.deltaText;
	runStreamText.set(runId, next);
	return next;
}

export function clearStreamingText(runId: string): void {
	runStreamText.delete(runId);
}

export function resetStreamingTextForTests(): void {
	runStreamText.clear();
}
