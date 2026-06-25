import { afterEach, describe, expect, it } from 'vitest';

import type { ChatMessage } from './messages.js';
import {
	forgetSessionThreadCache,
	hydrateSessionThreadCache,
	readSessionThreadCache,
	writeSessionThreadCache
} from './session-thread-cache.js';

const SESSION_KEY = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440000';

const USER_MESSAGE: ChatMessage = { id: 'u1', role: 'user', text: 'hello' };

describe('session-thread-cache', () => {
	afterEach(() => {
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

	it('does not hydrate data after memory is cleared', async () => {
		writeSessionThreadCache(SESSION_KEY, {
			sessionId: 'session-1',
			messages: [USER_MESSAGE],
			artifacts: [],
			activeArtifactId: null,
			artifactPanelOpen: false,
			artifactPanelDismissed: true
		});
		forgetSessionThreadCache(SESSION_KEY);

		await expect(hydrateSessionThreadCache(SESSION_KEY)).resolves.toBeNull();
	});
});
