import { json } from '@sveltejs/kit';

import { sendChat } from '$lib/server/chat-orchestration.js';
import { toApiErrorResponse } from '$lib/server/api-error.js';

export async function POST({ request }) {
	try {
		const body = (await request.json()) as {
			message?: string;
			sessionKey?: string;
			sessionId?: string;
		};
		const result = await sendChat(body);
		return json(result);
	} catch (error) {
		const { body, status } = toApiErrorResponse(error, 'failed to send message');
		return json(body, { status });
	}
}
