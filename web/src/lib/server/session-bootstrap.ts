import { normalizeHistoryMessages } from '$lib/chat/messages.js';
import {
	CHAT_HISTORY_LIMIT,
	CHAT_HISTORY_MAX_CHARS
} from '$lib/server/chat-history-config.js';
import { fetchChatHistory } from '$lib/server/gateway-chat-service.js';
import { listSessionArtifactSummaries } from '$lib/server/artifact-storage.js';
import { readPennySessionIndex } from '$lib/server/penny-session-index.js';
import { resolveSessionKey } from '$lib/server/session-key.js';
import { reconcileActivePennyTurn } from '$lib/server/penny-turn-service.js';

export async function getSessionBootstrap(sessionKeyRaw: string | null | undefined) {
	const sessionKey = resolveSessionKey(sessionKeyRaw);
	const [index, history, artifacts] = await Promise.all([
		readPennySessionIndex(),
		fetchChatHistory({
			sessionKey,
			limit: CHAT_HISTORY_LIMIT,
			maxChars: CHAT_HISTORY_MAX_CHARS
			}),
			listSessionArtifactSummaries(sessionKey)
		]);
	const messages = normalizeHistoryMessages(history.messages);
	const activeTurn = await reconcileActivePennyTurn({ sessionKey, messages });
	return {
		session: index.find((entry) => entry.key === sessionKey) ?? null,
		sessionKey: history.sessionKey,
		sessionId: history.sessionId,
		messages,
		artifacts,
		activeTurn
	};
}
