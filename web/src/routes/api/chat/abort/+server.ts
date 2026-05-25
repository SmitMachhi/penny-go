import { json } from '@sveltejs/kit';

import { abortChat } from '$lib/server/chat-orchestration.js';
import { toApiErrorResponse } from '$lib/server/api-error.js';

export async function POST({ request }) {
	try {
		const body = (await request.json()) as { sessionKey?: string; runId?: string };
		const result = await abortChat(body);
		return json(result);
	} catch (error) {
		const { body, status } = toApiErrorResponse(error, 'failed to abort chat run');
		return json(body, { status });
	}
}
