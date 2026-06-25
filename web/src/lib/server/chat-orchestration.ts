import { normalizeHistoryMessages } from '$lib/chat/messages.js';
import type { SsePayload } from '$lib/chat/stream-events.js';
import {
	CHAT_HISTORY_LIMIT,
	CHAT_HISTORY_MAX_CHARS
} from '$lib/server/chat-history-config.js';
import { subscribeToStream } from '$lib/server/chat-stream-hub.js';
import {
	abortChatRun,
	fetchChatHistory
} from '$lib/server/gateway-chat-service.js';
import { listSessionArtifactSummaries } from '$lib/server/artifact-storage.js';
import {
	assertOwnedPennySession,
	type PennySessionOwnershipStore
} from '$lib/server/penny-session-ownership.js';
import { bumpPennySessionIndex } from '$lib/server/penny-session-index.js';
import { submitPennyTurn } from '$lib/server/penny-turn-service.js';
import { resolveSessionKey } from '$lib/server/session-key.js';

type OwnedSessionInput = {
	ownershipStore?: PennySessionOwnershipStore;
	sessionKey?: string | null;
};

async function resolveOwnedSessionKey(input: OwnedSessionInput): Promise<string> {
	return input.ownershipStore
		? assertOwnedPennySession(input.ownershipStore, input.sessionKey)
		: resolveSessionKey(input.sessionKey);
}

export async function getChatHistory(input: OwnedSessionInput | string | null | undefined) {
	const sessionKey = await resolveOwnedSessionKey(
		typeof input === 'object' && input !== null ? input : { sessionKey: input }
	);
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
	ownershipStore?: PennySessionOwnershipStore;
	sessionId?: string;
	turnId?: string;
}) {
	const sessionKey = await resolveOwnedSessionKey(input);
	const response = await submitPennyTurn({
		message: input.message,
		sessionKey,
		sessionId: input.sessionId,
		turnId: input.turnId
	});
	await bumpPennySessionIndex(sessionKey);
	return response;
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
	const artifacts = await listSessionArtifactSummaries(sessionKey);
	return { artifacts };
}
