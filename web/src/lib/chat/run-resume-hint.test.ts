import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	clearRunResumeHint,
	isRunResumeHintStale,
	readRunResumeHint,
	writeRunResumeHint
} from './run-resume-hint.js';

const SESSION_KEY = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440000';

describe('run-resume-hint', () => {
	beforeEach(() => {
		const storage = new Map<string, string>();
		vi.stubGlobal('sessionStorage', {
			getItem: (key: string) => storage.get(key) ?? null,
			setItem: (key: string, value: string) => {
				storage.set(key, value);
			},
			removeItem: (key: string) => {
				storage.delete(key);
			}
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('round-trips a hint for the same session', () => {
		writeRunResumeHint({ sessionKey: SESSION_KEY, runId: 'run-1', startedAt: Date.now() });
		expect(readRunResumeHint(SESSION_KEY)?.runId).toBe('run-1');
	});

	it('clears stale hints', () => {
		const startedAt = Date.now() - 11 * 60 * 1000;
		writeRunResumeHint({ sessionKey: SESSION_KEY, runId: 'run-1', startedAt });
		expect(readRunResumeHint(SESSION_KEY)).toBeNull();
		expect(isRunResumeHintStale({ sessionKey: SESSION_KEY, runId: 'run-1', startedAt })).toBe(
			true
		);
	});

	it('clears only matching session hints', () => {
		writeRunResumeHint({ sessionKey: SESSION_KEY, runId: 'run-1', startedAt: Date.now() });
		clearRunResumeHint('agent:main:penny:other');
		expect(readRunResumeHint(SESSION_KEY)?.runId).toBe('run-1');
		clearRunResumeHint(SESSION_KEY);
		expect(readRunResumeHint(SESSION_KEY)).toBeNull();
	});
});
