import { normalizeHistoryMessages } from '$lib/chat/messages.js';
import type { SsePayload } from '$lib/chat/stream-events.js';
import { ValidationError } from '$lib/server/api-error.js';
import {
	CHAT_HISTORY_LIMIT,
	CHAT_HISTORY_MAX_CHARS
} from '$lib/server/chat-history-config.js';
import { subscribeToStream } from '$lib/server/chat-stream-hub.js';
import {
	abortChatRun,
	fetchChatHistory,
	sendChatMessage
} from '$lib/server/gateway-chat-service.js';
import { listSessionArtifacts } from '$lib/server/artifact-storage.js';
import { resolveSessionKey } from '$lib/server/session-key.js';

const CHAT_DELIVER = false;

export async function getChatHistory(sessionKeyRaw: string | null | undefined) {
	const sessionKey = resolveSessionKey(sessionKeyRaw);
	const history = await fetchChatHistory({
		sessionKey,
		limit: CHAT_HISTORY_LIMIT,
		maxChars: CHAT_HISTORY_MAX_CHARS
	});
	return {
		sessionKey: history.sessionKey,
		sessionId: history.sessionId,
		messages: normalizeHistoryMessages(history.messages)
	};
}

export async function sendChat(input: {
	sessionKey?: string;
	message?: string;
	sessionId?: string;
}) {
	const message = input.message?.trim();
	if (!message) {
		throw new ValidationError('message is required');
	}

	const sessionKey = resolveSessionKey(input.sessionKey);
	return sendChatMessage({
		message,
		sessionKey,
		sessionId: input.sessionId,
		deliver: CHAT_DELIVER
	});
}

export async function abortChat(input: { sessionKey?: string; runId?: string }) {
	const sessionKey = resolveSessionKey(input.sessionKey);
	await abortChatRun({ sessionKey, runId: input.runId });
	return { ok: true as const };
}

export function subscribeToChatStream(
	sessionKeyRaw: string | null | undefined,
	send: (payload: SsePayload) => void
): () => void {
	const sessionKey = resolveSessionKey(sessionKeyRaw);
	return subscribeToStream(sessionKey, send);
}

export async function getSessionArtifacts(sessionKeyRaw: string | null | undefined) {
	const sessionKey = resolveSessionKey(sessionKeyRaw);
	const artifacts = await listSessionArtifacts(sessionKey);
	return { sessionKey, artifacts };
}
