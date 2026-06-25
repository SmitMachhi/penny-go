import { withApiJsonEvent } from '$lib/server/api-handler.js';
import { getChatHistory } from '$lib/server/chat-orchestration.js';

export async function GET(event) {
	return withApiJsonEvent(
		event,
		async ({ url }) =>
			getChatHistory(url.searchParams.get('sessionKey')),
		'failed to load history',
		{ timingName: 'history' }
	);
}
