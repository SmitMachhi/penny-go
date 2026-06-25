import { withApiJsonEvent } from '$lib/server/api-handler.js';
import { getSessionArtifacts } from '$lib/server/chat-orchestration.js';

export async function GET(event) {
	return withApiJsonEvent(
		event,
		async ({ url }) =>
			getSessionArtifacts(url.searchParams.get('sessionKey')),
		'failed to list artifacts',
		{ timingName: 'artifacts' }
	);
}
