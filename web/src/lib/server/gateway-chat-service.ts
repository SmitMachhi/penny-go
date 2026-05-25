import { randomUUID } from 'node:crypto';

import { getGatewayRpc } from '$lib/server/gateway-rpc.js';

export async function fetchChatHistory(input: {
	sessionKey: string;
	limit: number;
	maxChars: number;
}) {
	return getGatewayRpc().chatHistory(input);
}

export async function sendChatMessage(input: {
	message: string;
	sessionKey: string;
	sessionId?: string;
	deliver: boolean;
	idempotencyKey?: string;
}) {
	const idempotencyKey = input.idempotencyKey ?? randomUUID();
	return getGatewayRpc().chatSend({
		message: input.message,
		sessionKey: input.sessionKey,
		sessionId: input.sessionId,
		deliver: input.deliver,
		idempotencyKey
	});
}

export async function abortChatRun(input: { sessionKey: string; runId?: string }) {
	await getGatewayRpc().chatAbort(input);
}

export async function pingGateway(): Promise<{ ok: true }> {
	await getGatewayRpc().connect();
	return { ok: true };
}
