import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	clearPendingFirstMessage,
	consumePendingFirstMessage,
	peekPendingFirstMessage,
	stashPendingFirstMessage
} from './pending-first-message.js';

const SESSION_KEY = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440000';

describe('pending-first-message', () => {
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

	it('consumes pending on read for legacy callers', () => {
		stashPendingFirstMessage({ sessionKey: SESSION_KEY, message: 'Hello' });
		expect(consumePendingFirstMessage(SESSION_KEY)).toBe('Hello');
		expect(consumePendingFirstMessage(SESSION_KEY)).toBeNull();
	});

	it('ignores pending for a different session', () => {
		stashPendingFirstMessage({ sessionKey: SESSION_KEY, message: 'Hello' });
		expect(
			peekPendingFirstMessage('agent:main:penny:00000000-0000-4000-8000-000000000002')
		).toBeNull();
	});

	it('keeps pending until explicitly cleared', () => {
		stashPendingFirstMessage({ sessionKey: SESSION_KEY, message: 'hello' });
		expect(peekPendingFirstMessage(SESSION_KEY)).toBe('hello');
		expect(peekPendingFirstMessage(SESSION_KEY)).toBe('hello');
		clearPendingFirstMessage();
		expect(peekPendingFirstMessage(SESSION_KEY)).toBeNull();
	});
});
