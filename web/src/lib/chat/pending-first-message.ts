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

function readPendingFirstMessageRaw(): PendingFirstMessage | null {
	if (typeof sessionStorage === 'undefined') {
		return null;
	}
	const raw = sessionStorage.getItem(STORAGE_KEY);
	if (!raw) {
		return null;
	}
	try {
		return JSON.parse(raw) as PendingFirstMessage;
	} catch {
		sessionStorage.removeItem(STORAGE_KEY);
		return null;
	}
}

export function peekPendingFirstMessage(sessionKey: string): string | null {
	const parsed = readPendingFirstMessageRaw();
	if (!parsed || parsed.sessionKey !== sessionKey || typeof parsed.message !== 'string') {
		return null;
	}
	const trimmed = parsed.message.trim();
	return trimmed.length > 0 ? trimmed : null;
}

export function clearPendingFirstMessage(): void {
	if (typeof sessionStorage === 'undefined') {
		return;
	}
	sessionStorage.removeItem(STORAGE_KEY);
}

/** @deprecated Prefer peek + clear on successful send */
export function consumePendingFirstMessage(sessionKey: string): string | null {
	const message = peekPendingFirstMessage(sessionKey);
	if (message) {
		clearPendingFirstMessage();
	}
	return message;
}
