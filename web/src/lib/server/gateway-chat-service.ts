import { randomUUID } from 'node:crypto';

import type { ChatSendResult } from '$lib/gateway/types.js';
import { getGatewayClient } from '$lib/server/gateway-client.js';

const CHAT_HISTORY_LIMIT = 200;
const CHAT_HISTORY_MAX_CHARS = 120_000;

export async function fetchChatHistory(sessionKey: string) {
	const client = getGatewayClient();
	const payload = (await client.request('chat.history', {
		sessionKey,
		limit: CHAT_HISTORY_LIMIT,
		maxChars: CHAT_HISTORY_MAX_CHARS
	})) as { messages?: unknown[]; sessionId?: string };

	return {
		sessionKey,
		sessionId: payload.sessionId,
		messages: payload.messages ?? []
	};
}

export async function sendChatMessage(input: {
	message: string;
	sessionKey: string;
	sessionId?: string;
}) {
	const idempotencyKey = randomUUID();
	const client = getGatewayClient();

	const response = (await client.request('chat.send', {
		sessionKey: input.sessionKey,
		...(input.sessionId ? { sessionId: input.sessionId } : {}),
		message: input.message,
		deliver: false,
		idempotencyKey
	})) as ChatSendResult;

	const runId = response.runId ?? idempotencyKey;
	return { runId, sessionKey: input.sessionKey };
}

export async function abortChatRun(input: { sessionKey: string; runId?: string }) {
	const client = getGatewayClient();
	await client.request(
		'chat.abort',
		input.runId ? { sessionKey: input.sessionKey, runId: input.runId } : { sessionKey: input.sessionKey }
	);
}

export async function pingGateway(): Promise<{ ok: true }> {
	await getGatewayClient().connect();
	return { ok: true };
}
