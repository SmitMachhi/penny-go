import { withApiJsonEvent } from '$lib/server/api-handler.js';
import { ownershipRegistryForEvent } from '$lib/server/auth-context.js';
import { getChatHistory } from '$lib/server/chat-orchestration.js';

export async function GET(event) {
	return withApiJsonEvent(
		event,
		async ({ url }) =>
			getChatHistory({
				ownershipStore: ownershipRegistryForEvent(event),
				sessionKey: url.searchParams.get('sessionKey')
			}),
		'failed to load history',
		{ timingName: 'history' }
	);
}
