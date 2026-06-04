import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchChatHistory } = vi.hoisted(() => ({ fetchChatHistory: vi.fn() }));

vi.mock('$lib/server/gateway-chat-service.js', () => ({
	fetchChatHistory
}));

import { upsertPennySessionIndex } from './penny-session-index.js';
import { getSessionBootstrap } from './session-bootstrap.js';

const SESSION_KEY = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440001';

describe('session bootstrap', () => {
	let repoRoot = '';
	let previousRepoRoot: string | undefined;

	beforeEach(async () => {
		previousRepoRoot = process.env.PENNY_REPO_ROOT;
		repoRoot = await mkdtemp(join(tmpdir(), 'penny-session-bootstrap-'));
		process.env.PENNY_REPO_ROOT = repoRoot;
		fetchChatHistory.mockReset();
	});

	afterEach(async () => {
		if (previousRepoRoot === undefined) {
			delete process.env.PENNY_REPO_ROOT;
		} else {
			process.env.PENNY_REPO_ROOT = previousRepoRoot;
		}
		await rm(repoRoot, { recursive: true, force: true });
	});

	it('returns indexed session metadata with chat history', async () => {
		await upsertPennySessionIndex({
			key: SESSION_KEY,
			title: 'Ontario SaaS',
			titleStatus: 'ready',
			updatedAt: 100,
			isLegacy: false
		});
		fetchChatHistory.mockResolvedValueOnce({
			sessionKey: SESSION_KEY,
			sessionId: 'session-1',
			messages: [{ id: 'user-1', role: 'user', text: 'hello' }]
		});

		const bootstrap = await getSessionBootstrap(SESSION_KEY);

		expect(bootstrap.session?.title).toBe('Ontario SaaS');
		expect(bootstrap.sessionId).toBe('session-1');
		expect(bootstrap.messages).toEqual([{ id: 'history-0', role: 'user', text: 'hello' }]);
	});
});
