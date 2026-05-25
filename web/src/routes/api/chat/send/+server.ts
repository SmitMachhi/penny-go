import { withApiJson, withApiJsonEvent } from '$lib/server/api-handler.js';
import { sendChat } from '$lib/server/chat-orchestration.js';

export async function POST({ request }) {
	return withApiJson(async () => {
		const body = (await request.json()) as {
			message?: string;
			sessionKey?: string;
			sessionId?: string;
		};
		return sendChat(body);
	}, 'failed to send message');
}
