import { json } from '@sveltejs/kit';

import { abortChatRun } from '$lib/server/chat-service.js';

export async function POST({ request }) {
	try {
		const body = (await request.json()) as { sessionKey?: string; runId?: string };
		await abortChatRun(body);
		return json({ ok: true });
	} catch (error) {
		const detail = error instanceof Error ? error.message : 'failed to abort chat run';
		return json({ error: detail }, { status: 503 });
	}
}
