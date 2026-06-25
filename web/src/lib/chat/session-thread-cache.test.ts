import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChatMessage } from './messages.js';
import {
	forgetSessionThreadCache,
	readSessionThreadCache,
	resetSessionThreadCacheForTests,
	writeSessionThreadCache
} from './session-thread-cache.js';

const SESSION_KEY = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440000';

const USER_MESSAGE: ChatMessage = { id: 'u1', role: 'user', text: 'hello' };

describe('session-thread-cache', () => {
	beforeEach(() => {
		resetSessionThreadCacheForTests();
	});

	afterEach(() => {
		forgetSessionThreadCache(SESSION_KEY);
		resetSessionThreadCacheForTests();
	});

	it('stores and reads a session snapshot', () => {
		writeSessionThreadCache(SESSION_KEY, {
			sessionId: 'session-1',
			messages: [USER_MESSAGE],
			artifacts: [],
			activeArtifactId: null,
			artifactPanelOpen: false,
			artifactPanelDismissed: true
		});

		const cached = readSessionThreadCache(SESSION_KEY);
		expect(cached?.sessionId).toBe('session-1');
		expect(cached?.messages).toEqual([USER_MESSAGE]);
		expect(cached?.artifactPanelDismissed).toBe(true);
	});

	it('forget removes cached session data', () => {
		writeSessionThreadCache(SESSION_KEY, {
			sessionId: null,
			messages: [],
			artifacts: [],
			activeArtifactId: null,
			artifactPanelOpen: false,
			artifactPanelDismissed: false
		});
		forgetSessionThreadCache(SESSION_KEY);
		expect(readSessionThreadCache(SESSION_KEY)).toBeNull();
	});

	it('restores snapshots from sessionStorage after memory is cleared', () => {
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

		writeSessionThreadCache(SESSION_KEY, {
			sessionId: 'session-1',
			messages: [USER_MESSAGE],
			artifacts: [],
			activeArtifactId: null,
			artifactPanelOpen: false,
			artifactPanelDismissed: true
		});
		resetSessionThreadCacheForTests();

		expect(readSessionThreadCache(SESSION_KEY)).toEqual({
			sessionId: 'session-1',
			messages: [USER_MESSAGE],
			artifacts: [],
			activeArtifactId: null,
			artifactPanelOpen: false,
			artifactPanelDismissed: true
		});

		vi.unstubAllGlobals();
	});
});
