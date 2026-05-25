import { json } from '@sveltejs/kit';

import { toApiErrorResponse } from '$lib/server/api-error.js';
import {
	deletePennySession,
	renamePennySession
} from '$lib/server/session-service.js';

export async function PATCH({ params, request }) {
	try {
		const body = (await request.json()) as { label?: string };
		const session = await renamePennySession(params.key, body.label ?? '');
		return json({ session });
	} catch (error) {
		const { body, status } = toApiErrorResponse(error, 'failed to rename session');
		return json(body, { status });
	}
}

export async function DELETE({ params }) {
	try {
		await deletePennySession(params.key);
		return json({ ok: true, key: params.key });
	} catch (error) {
		const { body, status } = toApiErrorResponse(error, 'failed to delete session');
		return json(body, { status });
	}
}
