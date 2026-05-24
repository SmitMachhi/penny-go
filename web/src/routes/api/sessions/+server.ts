import { json } from '@sveltejs/kit';

import {
	createPennySession,
	listPennySessions
} from '$lib/server/session-service.js';
import { sessionKeyErrorStatus } from '$lib/server/session-key.js';

export async function GET() {
	try {
		const sessions = await listPennySessions();
		return json({ sessions });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'failed to list sessions';
		return json({ error: message }, { status: 503 });
	}
}

export async function POST({ request }) {
	try {
		const body = (await request.json().catch(() => ({}))) as { label?: string };
		const session = await createPennySession(body.label);
		return json({ session }, { status: 201 });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'failed to create session';
		return json({ error: message }, { status: sessionKeyErrorStatus(error) });
	}
}
