export const LEGACY_SESSION_KEY = 'agent:main:main';
export const PENNY_SESSION_PREFIX = 'agent:main:penny:';

const SESSION_UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidSessionUuid(value: string): boolean {
	return SESSION_UUID_PATTERN.test(value);
}

export function isPennySessionKey(sessionKey: string): boolean {
	if (!sessionKey.startsWith(PENNY_SESSION_PREFIX)) {
		return false;
	}
	return isValidSessionUuid(sessionKey.slice(PENNY_SESSION_PREFIX.length));
}

export function parsePennySessionUuid(sessionKey: string): string | null {
	if (!isPennySessionKey(sessionKey)) {
		return null;
	}
	return sessionKey.slice(PENNY_SESSION_PREFIX.length);
}

export function buildPennySessionKey(uuid: string): string {
	return `${PENNY_SESSION_PREFIX}${uuid}`;
}

export function requirePennySessionUuid(sessionKey: string): string {
	const sessionUuid = parsePennySessionUuid(sessionKey);
	if (!sessionUuid) {
		throw new Error('invalid_session_key');
	}
	return sessionUuid;
}
