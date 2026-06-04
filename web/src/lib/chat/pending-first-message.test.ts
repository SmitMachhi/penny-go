import { afterEach, describe, expect, it } from 'vitest';

import {
	consumePendingFirstMessage,
	stashPendingFirstMessage
} from './pending-first-message.js';

const SESSION_KEY = 'agent:main:penny:00000000-0000-4000-8000-000000000001';

afterEach(() => {
	sessionStorage.clear();
});

describe('pending first message', () => {
	it('round-trips for matching session', () => {
		stashPendingFirstMessage({ sessionKey: SESSION_KEY, message: '  Hello  ' });
		expect(consumePendingFirstMessage(SESSION_KEY)).toBe('Hello');
		expect(consumePendingFirstMessage(SESSION_KEY)).toBeNull();
	});

	it('returns null for other session', () => {
		stashPendingFirstMessage({ sessionKey: SESSION_KEY, message: 'Hi' });
		expect(consumePendingFirstMessage('agent:main:penny:00000000-0000-4000-8000-000000000002')).toBeNull();
	});
});
