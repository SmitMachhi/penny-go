import { withApiJsonEvent } from '$lib/server/api-handler.js';
import {
	deletePennySession,
	renamePennySession
} from '$lib/server/session-orchestration.js';

export async function PATCH(event) {
	return withApiJsonEvent(
		event,
		async ({ params, request }) => {
			const key = params.key;
			if (!key) {
				throw new Error('session key is required');
			}
			const body = (await request.json()) as { label?: string };
			const session = await renamePennySession(key, body.label ?? '');
			return { session };
		},
		'failed to rename session'
	);
}

export async function DELETE(event) {
	return withApiJsonEvent(
		event,
		async ({ params }) => {
			const key = params.key;
			if (!key) {
				throw new Error('session key is required');
			}
			await deletePennySession(key);
			return { ok: true, key };
		},
		'failed to delete session'
	);
}
