import {
	buildPennySessionKey,
	isValidSessionUuid,
	LEGACY_SESSION_KEY,
	PENNY_SESSION_PREFIX
} from '@penny/shared/session-key';

export const LEGACY_ROUTE_ID = 'legacy';

export {
	buildPennySessionKey,
	LEGACY_SESSION_KEY,
	PENNY_SESSION_PREFIX
};

export function isPennySessionUuid(value: string): boolean {
	return isValidSessionUuid(value);
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
