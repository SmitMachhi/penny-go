import { withApiJsonEvent } from '$lib/server/api-handler.js';
import { ownershipRegistryForEvent } from '$lib/server/auth-context.js';
import { getPennySessionIndex } from '$lib/server/session-orchestration.js';

export async function GET(event) {
	return withApiJsonEvent(
		event,
		async (requestEvent) => ({
			sessions: await getPennySessionIndex(ownershipRegistryForEvent(requestEvent))
		}),
		'failed to load session index',
		{ timingName: 'sessions_index' }
	);
}
