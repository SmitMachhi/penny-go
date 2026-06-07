import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
	deletePennyTurnsForSession,
	patchPennyTurn,
	readPennyTurn,
	readPennyTurns,
	upsertPennyTurn,
	type PennyTurn
} from './penny-turn-store.js';

const SESSION_KEY = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440001';
const OTHER_SESSION_KEY = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440002';
const TURN_ID = 'turn-1';
const OTHER_TURN_ID = 'turn-2';
const CREATED_AT = 1_000;
const UPDATED_AT = 2_000;
const LATER_CREATED_AT = 3_000;

function turn(overrides: Partial<PennyTurn> = {}): PennyTurn {
	return {
		turnId: TURN_ID,
		sessionKey: SESSION_KEY,
		message: 'hello penny',
		status: 'pending',
		runId: null,
		createdAt: CREATED_AT,
		updatedAt: CREATED_AT,
		...overrides
	};
}

describe('penny turn store', () => {
	let repoRoot = '';
	let previousRepoRoot: string | undefined;

	beforeEach(async () => {
		previousRepoRoot = process.env.PENNY_REPO_ROOT;
		repoRoot = await mkdtemp(join(tmpdir(), 'penny-turn-store-'));
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

	it('keeps turns scoped to their session', async () => {
		await upsertPennyTurn(turn());
		await upsertPennyTurn(
			turn({
				sessionKey: OTHER_SESSION_KEY,
				turnId: OTHER_TURN_ID,
				createdAt: LATER_CREATED_AT,
				updatedAt: LATER_CREATED_AT
			})
		);

		expect(await readPennyTurns(SESSION_KEY)).toEqual([turn()]);
		expect(await readPennyTurn(SESSION_KEY, TURN_ID)).toEqual(turn());
		expect(await readPennyTurn(SESSION_KEY, OTHER_TURN_ID)).toBeNull();
	});

	it('updates an existing turn without duplicating it', async () => {
		await upsertPennyTurn(turn());
		await upsertPennyTurn(
			turn({
				status: 'submitted',
				runId: TURN_ID,
				updatedAt: UPDATED_AT
			})
		);

		expect(await readPennyTurns(SESSION_KEY)).toEqual([
			turn({
				status: 'submitted',
				runId: TURN_ID,
				updatedAt: UPDATED_AT
			})
		]);
	});

	it('patches turn state and deletes a session ledger', async () => {
		await upsertPennyTurn(turn());

		const patched = await patchPennyTurn(SESSION_KEY, TURN_ID, {
			status: 'completed',
			runId: TURN_ID,
			updatedAt: UPDATED_AT
		});

		expect(patched).toEqual(
			turn({
				status: 'completed',
				runId: TURN_ID,
				updatedAt: UPDATED_AT
			})
		);

		await deletePennyTurnsForSession(SESSION_KEY);

		expect(await readPennyTurns(SESSION_KEY)).toEqual([]);
	});
});
