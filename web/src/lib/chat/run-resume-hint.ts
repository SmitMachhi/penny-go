const STORAGE_KEY = 'penny:run-resume-hint';

const RUN_RESUME_HINT_TTL_MS = 10 * 60 * 1000;

export type RunResumeHint = {
	sessionKey: string;
	runId: string;
	startedAt: number;
};

export function writeRunResumeHint(hint: RunResumeHint): void {
	if (typeof sessionStorage === 'undefined') {
		return;
	}
	sessionStorage.setItem(STORAGE_KEY, JSON.stringify(hint));
}

export function readRunResumeHint(sessionKey: string): RunResumeHint | null {
	if (typeof sessionStorage === 'undefined') {
		return null;
	}
	const raw = sessionStorage.getItem(STORAGE_KEY);
	if (!raw) {
		return null;
	}
	let parsed: RunResumeHint;
	try {
		parsed = JSON.parse(raw) as RunResumeHint;
	} catch {
		sessionStorage.removeItem(STORAGE_KEY);
		return null;
	}
	if (parsed.sessionKey !== sessionKey || typeof parsed.runId !== 'string') {
		return null;
	}
	if (typeof parsed.startedAt !== 'number' || isRunResumeHintStale(parsed)) {
		sessionStorage.removeItem(STORAGE_KEY);
		return null;
	}
	return parsed;
}

export function clearRunResumeHint(sessionKey?: string): void {
	if (typeof sessionStorage === 'undefined') {
		return;
	}
	if (!sessionKey) {
		sessionStorage.removeItem(STORAGE_KEY);
		return;
	}
	const raw = sessionStorage.getItem(STORAGE_KEY);
	if (!raw) {
		return;
	}
	try {
		const parsed = JSON.parse(raw) as RunResumeHint;
		if (parsed.sessionKey === sessionKey) {
			sessionStorage.removeItem(STORAGE_KEY);
		}
	} catch {
		sessionStorage.removeItem(STORAGE_KEY);
	}
}

export function isRunResumeHintStale(hint: RunResumeHint, nowMs: number = Date.now()): boolean {
	return nowMs - hint.startedAt > RUN_RESUME_HINT_TTL_MS;
}
