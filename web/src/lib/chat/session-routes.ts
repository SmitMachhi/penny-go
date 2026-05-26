export const LEGACY_ROUTE_ID = 'legacy';
export const LEGACY_SESSION_KEY = 'agent:main:main';
export const PENNY_SESSION_PREFIX = 'agent:main:penny:';

const PENNY_SESSION_UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPennySessionUuid(value: string): boolean {
	return PENNY_SESSION_UUID_PATTERN.test(value);
}

export function buildPennySessionKey(uuid: string): string {
	return `${PENNY_SESSION_PREFIX}${uuid}`;
}

export function isValidChatRouteId(routeId: string): boolean {
	if (routeId === LEGACY_ROUTE_ID) {
		return true;
	}
	return isPennySessionUuid(routeId);
}

export function sessionKeyFromRouteId(routeId: string): string | null {
	if (routeId === LEGACY_ROUTE_ID) {
		return LEGACY_SESSION_KEY;
	}
	if (!isPennySessionUuid(routeId)) {
		return null;
	}
	return buildPennySessionKey(routeId);
}

export function routeIdFromSessionKey(sessionKey: string): string | null {
	if (sessionKey === LEGACY_SESSION_KEY) {
		return LEGACY_ROUTE_ID;
	}
	if (!sessionKey.startsWith(PENNY_SESSION_PREFIX)) {
		return null;
	}
	const uuid = sessionKey.slice(PENNY_SESSION_PREFIX.length);
	if (!isPennySessionUuid(uuid)) {
		return null;
	}
	return uuid;
}

export function chatPathFromSessionKey(sessionKey: string): string | null {
	const routeId = routeIdFromSessionKey(sessionKey);
	if (!routeId) {
		return null;
	}
	return `/c/${routeId}`;
}
