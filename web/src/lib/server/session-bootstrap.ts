import { normalizeHistoryMessages } from '$lib/chat/messages.js';
import {
	CHAT_HISTORY_LIMIT,
	CHAT_HISTORY_MAX_CHARS
} from '$lib/server/chat-history-config.js';
import { fetchChatHistory } from '$lib/server/gateway-chat-service.js';
import { readPennySessionIndex } from '$lib/server/penny-session-index.js';
import { resolveSessionKey } from '$lib/server/session-key.js';

export async function getSessionBootstrap(sessionKeyRaw: string | null | undefined) {
	const sessionKey = resolveSessionKey(sessionKeyRaw);
	const [index, history] = await Promise.all([
		readPennySessionIndex(),
		fetchChatHistory({
			sessionKey,
			limit: CHAT_HISTORY_LIMIT,
			maxChars: CHAT_HISTORY_MAX_CHARS
		})
	]);
	return {
		session: index.find((entry) => entry.key === sessionKey) ?? null,
		sessionKey: history.sessionKey,
		sessionId: history.sessionId,
		messages: normalizeHistoryMessages(history.messages)
	};
}
