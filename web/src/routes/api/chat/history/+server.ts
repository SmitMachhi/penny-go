import { json } from '@sveltejs/kit';

import { normalizeHistoryMessages } from '$lib/chat/messages.js';
import { fetchChatHistory } from '$lib/server/chat-service.js';
import { resolveSessionKey, sessionKeyErrorStatus } from '$lib/server/session-key.js';

export async function GET({ url }) {
	try {
		const sessionKey = resolveSessionKey(url.searchParams.get('sessionKey'));
		const history = await fetchChatHistory(sessionKey);
		return json({
			sessionKey: history.sessionKey,
			sessionId: history.sessionId,
			messages: normalizeHistoryMessages(history.messages)
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'failed to load history';
		return json({ error: message }, { status: sessionKeyErrorStatus(error) });
	}
}
