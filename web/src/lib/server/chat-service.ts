import { randomUUID } from 'node:crypto';

import { getGatewayConfig } from '$lib/server/gateway-env.js';
import { getGatewayClient } from '$lib/server/gateway-client.js';
import type { AgentEventPayload, ChatEventPayload } from '$lib/gateway/types.js';
import { extractMessageText } from '$lib/chat/messages.js';
import type { SsePayload } from '$lib/chat/stream-events.js';

type StreamSubscriber = {
	id: string;
	sessionKey: string;
	send: (payload: SsePayload) => void;
};

const subscribers = new Set<StreamSubscriber>();
let hubStarted = false;

function ensureHub(): void {
	if (hubStarted) {
		return;
	}
	hubStarted = true;

	const client = getGatewayClient();
	void client.connect();

	client.onEvent((event, payload) => {
		if (event === 'chat') {
			broadcastChat(payload as ChatEventPayload);
			return;
		}
		if (event === 'agent' || event === 'session.tool') {
			broadcastAgent(payload as AgentEventPayload);
		}
	});
}

function broadcastChat(payload: ChatEventPayload): void {
	const sessionKey = payload.sessionKey;
	const runId = payload.runId;
	if (!sessionKey || !runId) {
		return;
	}

	for (const subscriber of subscribers) {
		if (subscriber.sessionKey !== sessionKey) {
			continue;
		}

		if (payload.state === 'delta') {
			const deltaText =
				typeof payload.deltaText === 'string'
					? payload.deltaText
					: extractMessageText(payload.message);
			if (deltaText) {
				subscriber.send({ type: 'chat.delta', runId, text: deltaText });
			}
			continue;
		}

		if (payload.state === 'final') {
			const text = extractMessageText(payload.message);
			subscriber.send({ type: 'chat.final', runId, text });
			continue;
		}

		if (payload.state === 'error') {
			subscriber.send({
				type: 'chat.error',
				runId,
				message: payload.error ?? 'chat run failed'
			});
			continue;
		}

		if (payload.state === 'aborted') {
			subscriber.send({ type: 'chat.aborted', runId });
		}
	}
}

function broadcastAgent(payload: AgentEventPayload): void {
	const sessionKey = payload.sessionKey;
	const runId = payload.runId;
	const toolName = payload.data?.tool ?? payload.data?.name;
	if (!sessionKey || !runId || !toolName) {
		return;
	}

	const phase = payload.data?.phase ?? payload.data?.status;
	const done = phase === 'done' || phase === 'completed' || phase === 'success';

	for (const subscriber of subscribers) {
		if (subscriber.sessionKey !== sessionKey) {
			continue;
		}
		subscriber.send({
			type: done ? 'tool.done' : 'tool.start',
			runId,
			name: toolName
		});
	}
}

export function subscribeToStream(
	sessionKey: string,
	send: (payload: SsePayload) => void
): () => void {
	ensureHub();
	const subscriber: StreamSubscriber = { id: randomUUID(), sessionKey, send };
	subscribers.add(subscriber);
	send({ type: 'connected' });
	return () => subscribers.delete(subscriber);
}

export async function fetchChatHistory(sessionKey = getGatewayConfig().sessionKey) {
	const client = getGatewayClient();
	const payload = (await client.request('chat.history', {
		sessionKey,
		limit: 200,
		maxChars: 120_000
	})) as { messages?: unknown[]; sessionId?: string };

	return {
		sessionKey,
		sessionId: payload.sessionId,
		messages: payload.messages ?? []
	};
}

export async function sendChatMessage(input: {
	message: string;
	sessionKey?: string;
	sessionId?: string;
}) {
	const config = getGatewayConfig();
	const sessionKey = input.sessionKey ?? config.sessionKey;
	const runId = randomUUID();
	const client = getGatewayClient();

	await client.request('chat.send', {
		sessionKey,
		...(input.sessionId ? { sessionId: input.sessionId } : {}),
		message: input.message,
		deliver: false,
		idempotencyKey: runId
	});

	return { runId, sessionKey };
}

export async function abortChatRun(input: { sessionKey?: string; runId?: string }) {
	const config = getGatewayConfig();
	const sessionKey = input.sessionKey ?? config.sessionKey;
	const client = getGatewayClient();
	await client.request(
		'chat.abort',
		input.runId ? { sessionKey, runId: input.runId } : { sessionKey }
	);
}

export async function pingGateway(): Promise<{ ok: true; sessionKey: string }> {
	const config = getGatewayConfig();
	await getGatewayClient().connect();
	return { ok: true, sessionKey: config.sessionKey };
}
