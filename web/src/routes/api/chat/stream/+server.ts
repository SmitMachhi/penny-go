import { withApiCatch } from '$lib/server/api-handler.js';
import { ownershipRegistryForEvent } from '$lib/server/auth-context.js';
import { subscribeToChatStream } from '$lib/server/chat-orchestration.js';
import { assertOwnedPennySession } from '$lib/server/penny-session-ownership.js';
import { createSseResponse } from '$lib/server/sse-response.js';

export async function GET(event) {
	return withApiCatch(
			async () => {
				const sessionKey = await assertOwnedPennySession(
					ownershipRegistryForEvent(event),
					event.url.searchParams.get('sessionKey')
				);
				return createSseResponse((send) => subscribeToChatStream(sessionKey, send));
			},
			'invalid sessionKey',
			{ timingName: 'stream_connect' }
		);
}
