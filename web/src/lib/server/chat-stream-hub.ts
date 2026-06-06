import { randomUUID } from 'node:crypto';

import type { SsePayload } from '$lib/chat/stream-events.js';
import { isFundingBriefTool } from '$lib/chat/artifact-tools.js';
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
		isFundingBriefTool(ssePayload.name)
	) {
		void emitArtifactEvent(sessionKey, payload.runId, ssePayload.name).catch((error) => {
			console.error('artifact_sse_emit_failed', error);
		});
	}
}

const ARTIFACT_SSE_MAX_ATTEMPTS = 3;
const ARTIFACT_SSE_RETRY_MS = 150;

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

async function emitArtifactEvent(
	sessionKey: string,
	runId: string,
	toolName: string
): Promise<void> {
	for (let attempt = 0; attempt < ARTIFACT_SSE_MAX_ATTEMPTS; attempt += 1) {
		try {
			const artifactPayload = await buildArtifactSseForToolDone(sessionKey, toolName, runId);
			if (artifactPayload) {
				broadcastToSession(sessionKey, artifactPayload);
				return;
			}
		} catch (error) {
			if (attempt === ARTIFACT_SSE_MAX_ATTEMPTS - 1) {
				throw error;
			}
		}

		await sleep(ARTIFACT_SSE_RETRY_MS * (attempt + 1));
	}
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
