import { json } from '@sveltejs/kit';

import { subscribeToStream } from '$lib/server/chat-stream-hub.js';
import { toApiErrorResponse } from '$lib/server/api-error.js';
import { createSseResponse } from '$lib/server/sse-response.js';
import { resolveSessionKey } from '$lib/server/session-key.js';

export async function GET({ url }) {
	try {
		const sessionKey = resolveSessionKey(url.searchParams.get('sessionKey'));
		return createSseResponse((send) => subscribeToStream(sessionKey, send));
	} catch (error) {
		const { body, status } = toApiErrorResponse(error, 'invalid sessionKey');
		return json(body, { status });
	}
}
