import { withApiJson } from '$lib/server/api-handler.js';
import { sendChat } from '$lib/server/chat-orchestration.js';

export async function POST(event) {
	return withApiJson(async () => {
		const { request } = event;
		const body = (await request.json()) as {
			message?: string;
			sessionKey?: string;
			sessionId?: string;
			turnId?: string;
		};
		return sendChat(body);
	}, 'failed to send message', { timingName: 'send' });
}
