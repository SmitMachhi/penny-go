import { withApiJsonEvent } from '$lib/server/api-handler.js';
import { getSessionBootstrap } from '$lib/server/session-bootstrap.js';

export async function GET(event) {
	return withApiJsonEvent(
		event,
		async ({ params }) => getSessionBootstrap(params.key),
		'failed to bootstrap session',
		{ timingName: 'bootstrap' }
	);
}
