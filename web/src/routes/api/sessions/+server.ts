import { json } from '@sveltejs/kit';

import { toApiErrorResponse } from '$lib/server/api-error.js';
import {
	createPennySession,
	listPennySessions
} from '$lib/server/session-orchestration.js';

export async function GET() {
	try {
		const sessions = await listPennySessions();
		return json({ sessions });
	} catch (error) {
		const { body, status } = toApiErrorResponse(error, 'failed to list sessions');
		return json(body, { status });
	}
}

export async function POST({ request }) {
	try {
		const body = (await request.json().catch(() => ({}))) as { label?: string };
		const session = await createPennySession(body.label);
		return json({ session }, { status: 201 });
	} catch (error) {
		const { body, status } = toApiErrorResponse(error, 'failed to create session');
		return json(body, { status });
	}
}
