import { withApiJsonEvent } from '$lib/server/api-handler.js';
import { ownershipRegistryForEvent } from '$lib/server/auth-context.js';
import { getSessionArtifacts } from '$lib/server/chat-orchestration.js';

export async function GET(event) {
	return withApiJsonEvent(
		event,
		async ({ url }) =>
			getSessionArtifacts({
				ownershipStore: ownershipRegistryForEvent(event),
				sessionKey: url.searchParams.get('sessionKey')
			}),
		'failed to list artifacts',
		{ timingName: 'artifacts' }
	);
}
