import { isPennySessionKey } from '@penny/shared/session-key';

import { SessionKeyError, resolveSessionKey } from '$lib/server/session-key.js';

export type PennySessionOwnershipStore = {
	hasSession(sessionKey: string): Promise<boolean>;
};

export class SessionOwnershipError extends Error {
	constructor(message = 'session does not belong to the current user') {
		super(message);
		this.name = 'SessionOwnershipError';
	}
}

export async function assertOwnedPennySession(
	store: PennySessionOwnershipStore,
	sessionKeyRaw: string | null | undefined
): Promise<string> {
	const sessionKey = resolveSessionKey(sessionKeyRaw);
	if (!isPennySessionKey(sessionKey)) {
		throw new SessionOwnershipError();
	}
	if (!(await store.hasSession(sessionKey))) {
		throw new SessionOwnershipError();
	}
	return sessionKey;
}

export function toOwnershipError(error: unknown): Error {
	if (error instanceof SessionKeyError || error instanceof SessionOwnershipError) {
		return new SessionOwnershipError();
	}
	return error instanceof Error ? error : new Error('session ownership check failed');
}
