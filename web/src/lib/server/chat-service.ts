import { randomUUID } from 'node:crypto';

import { extractMessageText } from '$lib/chat/messages.js';
import type { SsePayload } from '$lib/chat/stream-events.js';
import type { AgentEventPayload, ChatEventPayload, ChatSendResult } from '$lib/gateway/types.js';
import { clearStreamingText, resolveStreamingText } from '$lib/server/chat-stream-text.js';
import { getGatewayClient } from '$lib/server/gateway-client.js';
import { getGatewayConfig } from '$lib/server/gateway-env.js';

type StreamSubscriber = {
	id: string;
	sessionKey: string;
	send: (payload: SsePayload) => void;
};

const subscribers = new Set<StreamSubscriber>();
let hubListener: ((event: string, payload: unknown) => void) | null = null;
let reconnectHookRegistered = false;

function ensureHub(): void {
	const client = getGatewayClient();
	void client.connect();

	if (!reconnectHookRegistered) {
		client.onDisconnect(() => {
			if (subscribers.size > 0) {
				void getGatewayClient().connect();
			}
		});
		reconnectHookRegistered = true;
	}

	if (hubListener) {
		return;
	}

	hubListener = (event, payload) => {
		if (event === 'chat') {
			broadcastChat(payload as ChatEventPayload);
			return;
		}
		if (event === 'agent' || event === 'session.tool') {
			broadcastAgent(payload as AgentEventPayload);
		}
	};

	client.onEvent(hubListener);
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
			const cumulative = resolveStreamingText(payload);
			if (cumulative) {
				safeSend(subscriber, {
					type: 'chat.delta',
					runId,
					text: cumulative,
					...(payload.replace ? { replace: true } : {})
				});
			}
			continue;
		}

		if (payload.state === 'final') {
			clearStreamingText(runId);
			const text = extractMessageText(payload.message);
			safeSend(subscriber, { type: 'chat.final', runId, text });
			continue;
		}

		if (payload.state === 'error') {
			clearStreamingText(runId);
			safeSend(subscriber, {
				type: 'chat.error',
				runId,
				message: payload.error ?? 'chat run failed'
			});
			continue;
		}

		if (payload.state === 'aborted') {
			clearStreamingText(runId);
			safeSend(subscriber, { type: 'chat.aborted', runId });
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
		safeSend(subscriber, {
			type: done ? 'tool.done' : 'tool.start',
			runId,
			name: toolName
		});
	}
}

function safeSend(subscriber: StreamSubscriber, payload: SsePayload): void {
	try {
		subscriber.send(payload);
	} catch {
		subscribers.delete(subscriber);
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

export async function fetchChatHistory(sessionKey: string) {
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

export async function pingGateway(): Promise<{ ok: true; sessionKey: string }> {
	const config = getGatewayConfig();
	await getGatewayClient().connect();
	return { ok: true, sessionKey: config.sessionKey };
}
