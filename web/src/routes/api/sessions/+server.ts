import { withApiJson } from '$lib/server/api-handler.js';
import { ownershipRegistryForEvent } from '$lib/server/auth-context.js';
import {
	createPennySession,
	listPennySessions
} from '$lib/server/session-orchestration.js';

export async function GET(event) {
	return withApiJson(
		async () => ({ sessions: await listPennySessions(ownershipRegistryForEvent(event)) }),
		'failed to list sessions',
		{ timingName: 'sessions' }
	);
}

export async function POST(event) {
	return withApiJson(async () => {
		const registry = ownershipRegistryForEvent(event);
		const { request } = event;
		const body = (await request.json().catch(() => ({}))) as { label?: string };
		const session = await createPennySession(body.label, registry);
		return { body: { session }, status: 201 };
		}, 'failed to create session', { timingName: 'sessions_create' });
}
