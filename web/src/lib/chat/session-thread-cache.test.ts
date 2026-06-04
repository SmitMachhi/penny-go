import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ChatMessage } from './messages.js';
import {
	forgetSessionThreadCache,
	hydrateSessionThreadCache,
	readSessionThreadCache,
	setSessionThreadCacheStorageForTests,
	writeSessionThreadCache
} from './session-thread-cache.js';

const SESSION_KEY = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440000';

const USER_MESSAGE: ChatMessage = { id: 'u1', role: 'user', text: 'hello' };

describe('session-thread-cache', () => {
	afterEach(() => {
		setSessionThreadCacheStorageForTests(null);
		forgetSessionThreadCache(SESSION_KEY);
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

	it('mirrors writes and deletes to persistent storage', () => {
		const write = vi.fn();
		const remove = vi.fn();
		setSessionThreadCacheStorageForTests({
			read: async () => null,
			write,
			delete: remove
		});
		const snapshot = {
			sessionId: 'session-1',
			messages: [USER_MESSAGE],
			artifacts: [],
			activeArtifactId: null,
			artifactPanelOpen: false,
			artifactPanelDismissed: false
		};

		writeSessionThreadCache(SESSION_KEY, snapshot);
		forgetSessionThreadCache(SESSION_KEY);

		expect(write).toHaveBeenCalledWith(SESSION_KEY, snapshot);
		expect(remove).toHaveBeenCalledWith(SESSION_KEY);
	});

	it('hydrates the in-memory cache from persistent storage', async () => {
		setSessionThreadCacheStorageForTests({
			read: async () => ({
				sessionId: 'session-1',
				messages: [USER_MESSAGE],
				artifacts: [],
				activeArtifactId: null,
				artifactPanelOpen: false,
				artifactPanelDismissed: true
			}),
			write: async () => {},
			delete: async () => {}
		});

		const hydrated = await hydrateSessionThreadCache(SESSION_KEY);

		expect(hydrated?.messages).toEqual([USER_MESSAGE]);
		expect(readSessionThreadCache(SESSION_KEY)?.artifactPanelDismissed).toBe(true);
	});
});
