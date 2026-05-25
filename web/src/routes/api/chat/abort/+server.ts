import { withApiJson } from '$lib/server/api-handler.js';
import { abortChat } from '$lib/server/chat-orchestration.js';

export async function POST({ request }) {
	return withApiJson(async () => {
		const body = (await request.json()) as { sessionKey?: string; runId?: string };
		return abortChat(body);
	}, 'failed to abort chat run');
}
