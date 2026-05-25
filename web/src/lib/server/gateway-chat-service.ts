import { randomUUID } from 'node:crypto';

import type { ChatSendResult } from '$lib/gateway/types.js';
import { getGatewayClient } from '$lib/server/gateway-client.js';

export async function fetchChatHistory(input: {
	sessionKey: string;
	limit: number;
	maxChars: number;
}) {
	const client = getGatewayClient();
	const payload = (await client.request('chat.history', {
		sessionKey: input.sessionKey,
		limit: input.limit,
		maxChars: input.maxChars
	})) as { messages?: unknown[]; sessionId?: string };

	return {
		sessionKey: input.sessionKey,
		sessionId: payload.sessionId,
		messages: payload.messages ?? []
	};
}

export async function sendChatMessage(input: {
	message: string;
	sessionKey: string;
	sessionId?: string;
	deliver: boolean;
	idempotencyKey?: string;
}) {
	const idempotencyKey = input.idempotencyKey ?? randomUUID();
	const client = getGatewayClient();

	const response = (await client.request('chat.send', {
		sessionKey: input.sessionKey,
		...(input.sessionId ? { sessionId: input.sessionId } : {}),
		message: input.message,
		deliver: input.deliver,
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
