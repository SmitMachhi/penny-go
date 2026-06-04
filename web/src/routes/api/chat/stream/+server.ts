import { withApiCatch } from '$lib/server/api-handler.js';
import { subscribeToChatStream } from '$lib/server/chat-orchestration.js';
import { createSseResponse } from '$lib/server/sse-response.js';

export async function GET({ url }) {
	return withApiCatch(
			() =>
				createSseResponse((send) => subscribeToChatStream(url.searchParams.get('sessionKey'), send)),
			'invalid sessionKey',
			{ timingName: 'stream_connect' }
		);
}
