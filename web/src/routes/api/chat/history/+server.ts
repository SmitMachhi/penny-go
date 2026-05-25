import { json } from '@sveltejs/kit';

import { abortChat, getChatHistory, sendChat } from '$lib/server/chat-orchestration.js';
import { subscribeToStream } from '$lib/server/chat-stream-hub.js';
import { toApiErrorResponse } from '$lib/server/api-error.js';
import { createSseResponse } from '$lib/server/sse-response.js';
import { resolveSessionKey } from '$lib/server/session-key.js';

export async function GET({ url }) {
	try {
		return json(await getChatHistory(url.searchParams.get('sessionKey')));
	} catch (error) {
		const { body, status } = toApiErrorResponse(error, 'failed to load history');
		return json(body, { status });
	}
}
