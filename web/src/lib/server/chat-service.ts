import { randomUUID } from 'node:crypto';

import { extractMessageText } from '$lib/chat/messages.js';
import type { SsePayload } from '$lib/chat/stream-events.js';
import type { AgentEventPayload, ChatEventPayload } from '$lib/gateway/types.js';
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

function ensureHub(): void {
	const client = getGatewayClient();
	// Always reconnect; hubListener stays on the singleton GatewayClient instance.
	void client.connect();

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
				subscriber.send({ type: 'chat.delta', runId, text: cumulative });
			}
			continue;
		}

		if (payload.state === 'final') {
			clearStreamingText(runId);
			const text = extractMessageText(payload.message);
			subscriber.send({ type: 'chat.final', runId, text });
			continue;
		}

		if (payload.state === 'error') {
			clearStreamingText(runId);
			subscriber.send({
				type: 'chat.error',
				runId,
				message: payload.error ?? 'chat run failed'
			});
			continue;
		}

		if (payload.state === 'aborted') {
			clearStreamingText(runId);
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
	const runId = randomUUID();
	const client = getGatewayClient();

	await client.request('chat.send', {
		sessionKey: input.sessionKey,
		...(input.sessionId ? { sessionId: input.sessionId } : {}),
		message: input.message,
		deliver: false,
		idempotencyKey: runId
	});

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
