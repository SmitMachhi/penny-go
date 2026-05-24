import { json } from '@sveltejs/kit';

import { abortChatRun } from '$lib/server/chat-service.js';
import { resolveSessionKey, sessionKeyErrorStatus } from '$lib/server/session-key.js';

export async function POST({ request }) {
	try {
		const body = (await request.json()) as { sessionKey?: string; runId?: string };
		const sessionKey = resolveSessionKey(body.sessionKey);
		await abortChatRun({ sessionKey, runId: body.runId });
		return json({ ok: true });
	} catch (error) {
		const detail = error instanceof Error ? error.message : 'failed to abort chat run';
		return json({ error: detail }, { status: sessionKeyErrorStatus(error) });
	}
}
