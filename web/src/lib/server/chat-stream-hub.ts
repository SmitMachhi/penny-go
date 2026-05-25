import { randomUUID } from 'node:crypto';

import type { SsePayload } from '$lib/chat/stream-events.js';
import type { AgentEventPayload, ChatEventPayload } from '$lib/gateway/types.js';
import { mapAgentEventToSse, mapChatEventToSse } from '$lib/server/chat-event-mapper.js';
import { buildArtifactSseForToolDone } from '$lib/server/artifact-sse-bridge.js';
import { ensureGatewayEventBus } from '$lib/server/gateway-events-service.js';

type StreamSubscriber = {
	id: string;
	sessionKey: string;
	send: (payload: SsePayload) => void;
};

const subscribers = new Set<StreamSubscriber>();

function ensureHub(): void {
	ensureGatewayEventBus({
		onEvent: (event, payload) => {
			if (event === 'chat') {
				dispatchMappedEvent(payload as ChatEventPayload, mapChatEventToSse);
				return;
			}
			if (event === 'agent' || event === 'session.tool') {
				dispatchMappedEvent(payload as AgentEventPayload, mapAgentEventToSse);
			}
		},
		shouldReconnect: () => subscribers.size > 0
	});
}

function dispatchMappedEvent<T extends { sessionKey?: string; runId?: string }>(
	payload: T,
	mapper: (payload: T) => SsePayload | null
): void {
	const sessionKey = payload.sessionKey;
	if (!sessionKey) {
		return;
	}

	const ssePayload = mapper(payload);
	if (ssePayload) {
		broadcastToSession(sessionKey, ssePayload);
	}

	if (
		ssePayload?.type === 'tool.done' &&
		payload.runId &&
		ssePayload.name === 'create_funding_brief'
	) {
		void emitArtifactEvent(sessionKey, payload.runId, ssePayload.name);
	}
}

async function emitArtifactEvent(
	sessionKey: string,
	runId: string,
	toolName: string
): Promise<void> {
	const artifactPayload = await buildArtifactSseForToolDone(sessionKey, toolName, runId);
	if (!artifactPayload) {
		return;
	}
	broadcastToSession(sessionKey, artifactPayload);
}

function broadcastToSession(sessionKey: string, payload: SsePayload): void {
	for (const subscriber of subscribers) {
		if (subscriber.sessionKey !== sessionKey) {
			continue;
		}
		safeSend(subscriber, payload);
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
