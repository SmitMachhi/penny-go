import { withApiJson } from '$lib/server/api-handler.js';
import { abortChat } from '$lib/server/chat-orchestration.js';

export async function POST(event) {
	return withApiJson(async () => {
		const { request } = event;
		const body = (await request.json()) as { sessionKey?: string; runId?: string };
		return abortChat(body);
	}, 'failed to abort chat run');
}
