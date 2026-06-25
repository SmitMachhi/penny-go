import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchChatHistory, listSessionArtifactSummaries } = vi.hoisted(() => ({
	fetchChatHistory: vi.fn(),
	listSessionArtifactSummaries: vi.fn()
}));

vi.mock('$lib/server/gateway-chat-service.js', () => ({
	fetchChatHistory
}));

vi.mock('$lib/server/artifact-storage.js', () => ({
	listSessionArtifactSummaries
}));

import { upsertPennySessionIndex } from './penny-session-index.js';
import { upsertPennyTurn } from './penny-turn-store.js';
import { getSessionBootstrap } from './session-bootstrap.js';

const SESSION_KEY = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440001';
const ARTIFACT_ID = '00000000-0000-4000-8000-000000000001';
const ARTIFACT_VERSION = 3;
const TURN_ID = 'turn-1';
const RUN_ID = 'run-1';

describe('session bootstrap', () => {
	let repoRoot = '';
	let previousRepoRoot: string | undefined;

	beforeEach(async () => {
		previousRepoRoot = process.env.PENNY_REPO_ROOT;
		repoRoot = await mkdtemp(join(tmpdir(), 'penny-session-bootstrap-'));
		process.env.PENNY_REPO_ROOT = repoRoot;
		fetchChatHistory.mockReset();
		listSessionArtifactSummaries.mockReset();
		listSessionArtifactSummaries.mockResolvedValue([]);
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

	it('returns artifact summaries with chat history', async () => {
		listSessionArtifactSummaries.mockResolvedValueOnce([
			{
				artifactId: ARTIFACT_ID,
				title: 'Execution plan',
				programCount: 2,
				version: ARTIFACT_VERSION,
				latestVersion: ARTIFACT_VERSION,
				updatedAt: '2026-06-05T13:39:01.968Z',
				pdfAvailable: true
			}
		]);
		fetchChatHistory.mockResolvedValueOnce({
			sessionKey: SESSION_KEY,
			sessionId: 'session-1',
			messages: []
		});

		const bootstrap = await getSessionBootstrap(SESSION_KEY);

		expect(listSessionArtifactSummaries).toHaveBeenCalledWith(SESSION_KEY);
		expect(bootstrap.artifacts).toEqual([
			{
				artifactId: ARTIFACT_ID,
				title: 'Execution plan',
				programCount: 2,
				version: ARTIFACT_VERSION,
				latestVersion: ARTIFACT_VERSION,
				updatedAt: '2026-06-05T13:39:01.968Z',
				pdfAvailable: true
			}
		]);
	});

	it('returns active run progress for an unfinished reply', async () => {
		const now = Date.now();
		await upsertPennyTurn({
			turnId: TURN_ID,
			sessionKey: SESSION_KEY,
			message: 'still running',
			status: 'submitted',
			runId: RUN_ID,
			createdAt: now,
			updatedAt: now
		});
		fetchChatHistory.mockResolvedValueOnce({
			sessionKey: SESSION_KEY,
			sessionId: 'session-1',
			messages: [
				{
					type: 'message',
					message: {
						role: 'user',
						content: [{ type: 'text', text: 'still running' }]
					}
				},
				{
					type: 'message',
					message: {
						role: 'assistant',
						content: [
							{ type: 'text', text: 'Searching the corpus.' },
							{
								type: 'toolCall',
								toolName: 'search_corpus',
								toolCallId: 'call-1'
							}
						],
						stopReason: 'toolUse'
					}
				}
			]
		});

		const bootstrap = await getSessionBootstrap(SESSION_KEY);

		expect(bootstrap.activeTurn).toMatchObject({
			runId: RUN_ID,
			status: 'running',
			turnId: TURN_ID
		});
		expect(bootstrap.activeRunProgress).toMatchObject({
			streamingAnswerText: 'Searching the corpus.',
			tools: [expect.objectContaining({ name: 'search_corpus', phase: 'running' })]
		});
		expect(bootstrap.messages.at(-1)).toMatchObject({
			role: 'assistant',
			text: 'Searching the corpus.'
		});
	});

	it('returns the backend active turn for an unfinished reply', async () => {
		const now = Date.now();
		await upsertPennyTurn({
			turnId: TURN_ID,
			sessionKey: SESSION_KEY,
			message: 'still running',
			status: 'submitted',
			runId: RUN_ID,
			createdAt: now,
			updatedAt: now
		});
		fetchChatHistory.mockResolvedValueOnce({
			sessionKey: SESSION_KEY,
			sessionId: 'session-1',
			messages: [{ id: 'user-1', role: 'user', text: 'still running' }]
		});

		const bootstrap = await getSessionBootstrap(SESSION_KEY);

		expect(bootstrap.activeTurn).toMatchObject({
			runId: RUN_ID,
			status: 'running',
			turnId: TURN_ID
		});
	});

	it('adds a checkpoint recovery answer when verified evidence exists after an aborted run', async () => {
		const now = Date.now();
		await upsertPennyTurn({
			turnId: TURN_ID,
			sessionKey: SESSION_KEY,
			message: 'We run a 42-person precision parts manufacturer near Laval, Quebec.',
			status: 'aborted',
			runId: RUN_ID,
			createdAt: now,
			updatedAt: now
		});
		fetchChatHistory.mockResolvedValueOnce({
			sessionKey: SESSION_KEY,
			sessionId: 'session-1',
			messages: [
				{
					type: 'message',
					message: {
						role: 'user',
						content: [
							{
								type: 'text',
								text: 'We run a 42-person precision parts manufacturer near Laval, Quebec.'
							}
						]
					}
				},
				{
					type: 'message',
					message: {
						role: 'assistant',
						content: [{ type: 'text', text: 'Verifying official source.' }],
						stopReason: 'toolUse'
					}
				},
				{
					type: 'message',
					message: {
						role: 'toolResult',
						content: [
							{
								type: 'text',
								text: JSON.stringify({
									success: true,
									url: 'https://lavaleconomique.com/programme/virage-techno-manufacturier/',
									reader: 'firecrawl_scrape',
									verification_source: 'firecrawl_official_scrape',
									markdown:
										'# Virage techno manufacturier\nSubvention allant jusqu a 50 000 $ pour automatisation et robotisation.'
								})
							}
						]
					}
				},
				{
					type: 'message',
					message: {
						role: 'assistant',
						content: [],
						stopReason: 'aborted'
					}
				}
			]
		});

		const bootstrap = await getSessionBootstrap(SESSION_KEY);

		expect(bootstrap.activeTurn).toBeNull();
		expect(bootstrap.messages.at(-1)).toMatchObject({
			role: 'assistant',
			text: expect.stringContaining('Penny verified these before the run was interrupted')
		});
		expect(bootstrap.messages.at(-1)?.text).toContain('Virage techno manufacturier');
	});
});
