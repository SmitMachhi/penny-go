import { json } from '@sveltejs/kit';

import { sendChatMessage } from '$lib/server/chat-service.js';

export async function POST({ request }) {
	try {
		const body = (await request.json()) as {
			message?: string;
			sessionKey?: string;
			sessionId?: string;
		};
		const message = body.message?.trim();
		if (!message) {
			return json({ error: 'message is required' }, { status: 400 });
		}

		const result = await sendChatMessage({
			message,
			sessionKey: body.sessionKey,
			sessionId: body.sessionId
		});
		return json(result);
	} catch (error) {
		const detail = error instanceof Error ? error.message : 'failed to send message';
		return json({ error: detail }, { status: 503 });
	}
}
