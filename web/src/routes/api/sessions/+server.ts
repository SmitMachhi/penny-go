import { withApiJson } from '$lib/server/api-handler.js';
import {
	createPennySession,
	listPennySessions
} from '$lib/server/session-orchestration.js';

export async function GET() {
	return withApiJson(async () => ({ sessions: await listPennySessions() }), 'failed to list sessions');
}

export async function POST({ request }) {
	return withApiJson(async () => {
		const body = (await request.json().catch(() => ({}))) as { label?: string };
		const session = await createPennySession(body.label);
		return { body: { session }, status: 201 };
	}, 'failed to create session');
}
