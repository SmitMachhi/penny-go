import { mkdir, writeFile } from 'node:fs/promises';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
	INDEX_FILENAME,
	META_FILENAME,
	resolveSessionArtifactIndexPath,
	resolveSessionArtifactsDir
} from '@penny/shared/penny-paths';

import { buildArtifactSseForToolDone } from './artifact-sse-bridge.js';
import { listSessionArtifacts } from './artifact-storage.js';

const SESSION_KEY = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440000';
const SESSION_UUID = '550e8400-e29b-41d4-a716-446655440000';
const ARTIFACT_ID = '6ba7b814-9dad-41d4-a716-446655440000';

describe('artifact storage', () => {
	let repoRoot = '';
	let previousRepoRoot: string | undefined;

	beforeEach(async () => {
		previousRepoRoot = process.env.PENNY_REPO_ROOT;
		repoRoot = await mkdtemp(join(tmpdir(), 'penny-artifacts-'));
		process.env.PENNY_REPO_ROOT = repoRoot;

		const sessionDir = resolveSessionArtifactsDir(repoRoot, SESSION_UUID);
		const artifactDir = join(sessionDir, ARTIFACT_ID);
		await mkdir(artifactDir, { recursive: true });

		const meta = {
			artifactId: ARTIFACT_ID,
			sessionUuid: SESSION_UUID,
			title: 'Test brief',
			programCount: 2,
			version: 1,
			triggerReason: 'auto' as const,
			createdAt: '2026-05-24T12:00:00.000Z',
			updatedAt: '2026-05-24T12:00:00.000Z'
		};

		await writeFile(join(artifactDir, META_FILENAME), `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
		await writeFile(
			resolveSessionArtifactIndexPath(repoRoot, SESSION_UUID),
			`${JSON.stringify([meta], null, 2)}\n`,
			'utf8'
		);
	});

	afterEach(() => {
		if (previousRepoRoot === undefined) {
			delete process.env.PENNY_REPO_ROOT;
		} else {
			process.env.PENNY_REPO_ROOT = previousRepoRoot;
		}
	});

	it('lists session artifacts from index.json', async () => {
		const artifacts = await listSessionArtifacts(SESSION_KEY);
		expect(artifacts).toHaveLength(1);
		expect(artifacts[0]?.title).toBe('Test brief');
	});

	it('buildArtifactSseForToolDone returns create payload', async () => {
		const payload = await buildArtifactSseForToolDone(
			SESSION_KEY,
			'create_funding_brief',
			'run-123'
		);

		expect(payload).not.toBeNull();
		if (!payload || payload.type !== 'artifact.create') {
			throw new Error('expected artifact.create payload');
		}
		expect(payload.artifact.artifactId).toBe(ARTIFACT_ID);
	});
});
