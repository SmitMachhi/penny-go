import { json } from '@sveltejs/kit';

import { subscribeToChatStream } from '$lib/server/chat-orchestration.js';
import { toApiErrorResponse } from '$lib/server/api-error.js';
import { createSseResponse } from '$lib/server/sse-response.js';

export async function GET({ url }) {
	try {
		return createSseResponse((send) =>
			subscribeToChatStream(url.searchParams.get('sessionKey'), send)
		);
	} catch (error) {
		const { body, status } = toApiErrorResponse(error, 'invalid sessionKey');
		return json(body, { status });
	}
}
