import { json } from '@sveltejs/kit';

import { getChatHistory } from '$lib/server/chat-orchestration.js';
import { toApiErrorResponse } from '$lib/server/api-error.js';

export async function GET({ url }) {
	try {
		return json(await getChatHistory(url.searchParams.get('sessionKey')));
	} catch (error) {
		const { body, status } = toApiErrorResponse(error, 'failed to load history');
		return json(body, { status });
	}
}
