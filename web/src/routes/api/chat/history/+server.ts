import { json } from '@sveltejs/kit';

import { normalizeHistoryMessages } from '$lib/chat/messages.js';
import { fetchChatHistory } from '$lib/server/chat-service.js';

export async function GET({ url }) {
	try {
		const sessionKey = url.searchParams.get('sessionKey') ?? undefined;
		const history = await fetchChatHistory(sessionKey);
		return json({
			sessionKey: history.sessionKey,
			sessionId: history.sessionId,
			messages: normalizeHistoryMessages(history.messages)
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'failed to load history';
		return json({ error: message }, { status: 503 });
	}
}
