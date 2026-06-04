const STORAGE_KEY = 'penny:pending-first-message';

export type PendingFirstMessage = {
	sessionKey: string;
	message: string;
};

export function stashPendingFirstMessage(pending: PendingFirstMessage): void {
	if (typeof sessionStorage === 'undefined') {
		return;
	}
	sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
}

export function consumePendingFirstMessage(sessionKey: string): string | null {
	if (typeof sessionStorage === 'undefined') {
		return null;
	}
	const raw = sessionStorage.getItem(STORAGE_KEY);
	if (!raw) {
		return null;
	}
	let parsed: PendingFirstMessage;
	try {
		parsed = JSON.parse(raw) as PendingFirstMessage;
	} catch {
		sessionStorage.removeItem(STORAGE_KEY);
		return null;
	}
	if (parsed.sessionKey !== sessionKey || typeof parsed.message !== 'string') {
		return null;
	}
	sessionStorage.removeItem(STORAGE_KEY);
	const trimmed = parsed.message.trim();
	return trimmed.length > 0 ? trimmed : null;
}
