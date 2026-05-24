import { json } from '@sveltejs/kit';

import {
	deletePennySession,
	renamePennySession
} from '$lib/server/session-service.js';
import { resolveSessionKey, sessionKeyErrorStatus } from '$lib/server/session-key.js';

function decodeSessionKeyParam(raw: string): string {
	return decodeURIComponent(raw);
}

export async function PATCH({ params, request }) {
	try {
		const sessionKey = resolveSessionKey(decodeSessionKeyParam(params.key));
		const body = (await request.json()) as { label?: string };
		const label = body.label?.trim();
		if (!label) {
			return json({ error: 'label is required' }, { status: 400 });
		}

		const session = await renamePennySession(sessionKey, label);
		return json({ session });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'failed to rename session';
		return json({ error: message }, { status: sessionKeyErrorStatus(error) });
	}
}

export async function DELETE({ params }) {
	try {
		const sessionKey = resolveSessionKey(decodeSessionKeyParam(params.key));
		await deletePennySession(sessionKey);
		return json({ ok: true, key: sessionKey });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'failed to delete session';
		return json({ error: message }, { status: sessionKeyErrorStatus(error) });
	}
}
