export const ACTIVE_SESSION_STORAGE_KEY = 'penny:activeSessionKey';

export function readActiveSessionKey(): string | null {
	if (typeof localStorage === 'undefined') {
		return null;
	}
	const value = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY)?.trim();
	return value || null;
}

export function writeActiveSessionKey(sessionKey: string): void {
	if (typeof localStorage === 'undefined') {
		return;
	}
	localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, sessionKey);
}

export function clearActiveSessionKey(): void {
	if (typeof localStorage === 'undefined') {
		return;
	}
	localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
}

export function pickBootstrapSessionKey(
	storedKey: string | null,
	sessions: { key: string }[]
): string | null {
	if (storedKey && sessions.some((session) => session.key === storedKey)) {
		return storedKey;
	}
	return sessions[0]?.key ?? null;
}
