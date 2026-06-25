import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { upsertPennyTurn } from './penny-turn-store.js';
import {
	ACTIVE_TURN_STALE_MS,
	ACTIVE_TURN_STALE_ERROR,
	expireStaleActiveTurnIfNeeded
} from './penny-turn-lifecycle.js';

const SESSION_KEY = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440001';
const TURN_ID = 'turn-1';
const RUN_ID = 'run-1';

describe('penny turn lifecycle', () => {
	let repoRoot = '';
	let previousRepoRoot: string | undefined;

	beforeEach(async () => {
		previousRepoRoot = process.env.PENNY_REPO_ROOT;
		repoRoot = await mkdtemp(join(tmpdir(), 'penny-turn-lifecycle-'));
		process.env.PENNY_REPO_ROOT = repoRoot;
	});

	afterEach(async () => {
		if (previousRepoRoot === undefined) {
			delete process.env.PENNY_REPO_ROOT;
		} else {
			process.env.PENNY_REPO_ROOT = previousRepoRoot;
		}
		await rm(repoRoot, { recursive: true, force: true });
	});

	it('expires stale active turns', async () => {
		const staleUpdatedAt = Date.now() - ACTIVE_TURN_STALE_MS - 1;
		await upsertPennyTurn({
			turnId: TURN_ID,
			sessionKey: SESSION_KEY,
			message: 'hello',
			status: 'running',
			runId: RUN_ID,
			createdAt: staleUpdatedAt,
			updatedAt: staleUpdatedAt
		});

		const expired = await expireStaleActiveTurnIfNeeded(
			{
				turnId: TURN_ID,
				sessionKey: SESSION_KEY,
				message: 'hello',
				status: 'running',
				runId: RUN_ID,
				createdAt: staleUpdatedAt,
				updatedAt: staleUpdatedAt
			},
			Date.now()
		);

		expect(expired).toMatchObject({
			status: 'failed',
			error: ACTIVE_TURN_STALE_ERROR
		});
	});

	it('keeps fresh active turns', async () => {
		const now = Date.now();
		const turn = {
			turnId: TURN_ID,
			sessionKey: SESSION_KEY,
			message: 'hello',
			status: 'running' as const,
			runId: RUN_ID,
			createdAt: now,
			updatedAt: now
		};

		await expect(expireStaleActiveTurnIfNeeded(turn, now)).resolves.toEqual(turn);
	});
});
