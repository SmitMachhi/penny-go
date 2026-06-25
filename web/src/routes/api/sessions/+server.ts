import { withApiJson } from '$lib/server/api-handler.js';
import {
	createPennySession,
	listPennySessions
} from '$lib/server/session-orchestration.js';

export async function GET() {
	return withApiJson(
		async () => ({ sessions: await listPennySessions() }),
		'failed to list sessions',
		{ timingName: 'sessions' }
	);
}

export async function POST(event) {
	return withApiJson(
		async () => {
			const { request } = event;
			const body = (await request.json().catch(() => ({}))) as { label?: string };
			const session = await createPennySession(body.label);
			return { body: { session }, status: 201 };
		},
		'failed to create session',
		{ timingName: 'sessions_create' }
	);
}
