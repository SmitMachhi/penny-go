const STORAGE_KEY = 'penny:pending-first-message';

export type PendingFirstMessage = {
	sessionKey: string;
	message: string;
	turnId: string;
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
		const parsed: unknown = JSON.parse(raw);
		if (!isPendingFirstMessage(parsed)) {
			return null;
		}
		return parsed;
	} catch {
		sessionStorage.removeItem(STORAGE_KEY);
		return null;
	}
}

function isPendingFirstMessage(candidate: unknown): candidate is PendingFirstMessage {
	if (typeof candidate !== 'object' || candidate === null) {
		return false;
	}
	const pending = candidate as Record<string, unknown>;
	return (
		typeof pending.sessionKey === 'string' &&
		typeof pending.message === 'string' &&
		typeof pending.turnId === 'string'
	);
}

export function peekPendingFirstMessage(sessionKey: string): PendingFirstMessage | null {
	const parsed = readPendingFirstMessageRaw();
	if (!parsed || parsed.sessionKey !== sessionKey || typeof parsed.message !== 'string') {
		return null;
	}
	const trimmed = parsed.message.trim();
	if (!trimmed || !parsed.turnId.trim()) {
		return null;
	}
	return { ...parsed, message: trimmed, turnId: parsed.turnId.trim() };
}

export function clearPendingFirstMessage(): void {
	if (typeof sessionStorage === 'undefined') {
		return;
	}
	sessionStorage.removeItem(STORAGE_KEY);
}

/** @deprecated Prefer peek + clear on successful send */
export function consumePendingFirstMessage(sessionKey: string): string | null {
	const pending = peekPendingFirstMessage(sessionKey);
	if (pending) {
		clearPendingFirstMessage();
	}
	return pending?.message ?? null;
}
