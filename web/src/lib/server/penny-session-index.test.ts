import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
	bumpPennySessionIndex,
	deletePennySessionIndex,
	readPennySessionIndex,
	replacePennySessionIndex,
	upsertPennySessionIndex
} from './penny-session-index.js';

const SESSION_A = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440001';
const SESSION_B = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440002';

function session(key: string, title: string, updatedAt: number) {
	return { key, title, updatedAt, titleStatus: 'ready' as const, isLegacy: false };
}

describe('penny session index', () => {
	let repoRoot = '';
	let previousRepoRoot: string | undefined;

	beforeEach(async () => {
		previousRepoRoot = process.env.PENNY_REPO_ROOT;
		repoRoot = await mkdtemp(join(tmpdir(), 'penny-session-index-'));
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

	it('stores sessions sorted by freshness', async () => {
		await replacePennySessionIndex([
			session(SESSION_A, 'Older', 100),
			session(SESSION_B, 'Newer', 200)
		]);

		expect(await readPennySessionIndex()).toEqual([
			session(SESSION_B, 'Newer', 200),
			session(SESSION_A, 'Older', 100)
		]);
	});

	it('upserts, bumps, and deletes sessions', async () => {
		await upsertPennySessionIndex(session(SESSION_A, 'First', 100));
		await upsertPennySessionIndex(session(SESSION_A, 'Renamed', 150));
		await bumpPennySessionIndex(SESSION_A, 250);
		await upsertPennySessionIndex(session(SESSION_B, 'Second', 200));
		await deletePennySessionIndex(SESSION_B);

		expect(await readPennySessionIndex()).toEqual([
			session(SESSION_A, 'Renamed', 250)
		]);
	});

	it('writes a JSON file under workspace', async () => {
		await upsertPennySessionIndex(session(SESSION_A, 'Saved', 100));

		const raw = await readFile(join(repoRoot, 'workspace', 'penny-session-index.json'), 'utf8');
		expect(JSON.parse(raw)).toEqual([session(SESSION_A, 'Saved', 100)]);
	});
});
