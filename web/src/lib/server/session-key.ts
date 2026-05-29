export {
	buildPennySessionKey,
	isPennySessionKey,
	LEGACY_SESSION_KEY,
	parsePennySessionUuid,
	PENNY_SESSION_PREFIX
} from '@penny/shared/session-key';

export const MAX_SESSION_LABEL_LENGTH = 60;

import {
	isPennySessionKey,
	LEGACY_SESSION_KEY
} from '@penny/shared/session-key';

export class SessionKeyError extends Error {
	constructor(message = 'sessionKey is not allowed') {
		super(message);
		this.name = 'SessionKeyError';
	}
}

export function isAllowedSessionKey(sessionKey: string): boolean {
	return isPennySessionKey(sessionKey) || sessionKey === LEGACY_SESSION_KEY;
}

export function resolveSessionKey(candidate: string | null | undefined): string {
	const sessionKey = candidate?.trim();
	if (!sessionKey || !isAllowedSessionKey(sessionKey)) {
		throw new SessionKeyError();
	}
	return sessionKey;
}
