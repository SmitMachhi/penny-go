import { withApiJsonEvent } from '$lib/server/api-handler.js';
import { ownershipRegistryForEvent } from '$lib/server/auth-context.js';
import { assertOwnedPennySession } from '$lib/server/penny-session-ownership.js';
import { getSessionBootstrap } from '$lib/server/session-bootstrap.js';

export async function GET(event) {
	return withApiJsonEvent(
		event,
		async ({ params }) => {
			const sessionKey = await assertOwnedPennySession(
				ownershipRegistryForEvent(event),
				params.key
			);
			return getSessionBootstrap(sessionKey);
		},
		'failed to bootstrap session',
		{ timingName: 'bootstrap' }
	);
}
