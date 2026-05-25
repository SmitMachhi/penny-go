import { normalizeHistoryMessages } from '$lib/chat/messages.js';
import { ValidationError } from '$lib/server/api-error.js';
import {
	abortChatRun,
	fetchChatHistory,
	pingGateway,
	sendChatMessage
} from '$lib/server/gateway-chat-service.js';
import { resolveSessionKey } from '$lib/server/session-key.js';

export async function getChatHistory(sessionKeyRaw: string | null | undefined) {
	const sessionKey = resolveSessionKey(sessionKeyRaw);
	const history = await fetchChatHistory(sessionKey);
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
		sessionId: input.sessionId
	});
}

export async function abortChat(input: { sessionKey?: string; runId?: string }) {
	const sessionKey = resolveSessionKey(input.sessionKey);
	await abortChatRun({ sessionKey, runId: input.runId });
	return { ok: true as const };
}

export async function checkPennyHealth() {
	return pingGateway();
}
