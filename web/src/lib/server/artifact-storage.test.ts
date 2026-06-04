import { mkdir, rm, writeFile } from 'node:fs/promises';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
	INDEX_FILENAME,
	META_FILENAME,
	PDF_FILENAME,
	VERSION_META_FILENAME,
	resolveArtifactVersionDir,
	resolveArtifactVersionFilePath,
	resolveSessionArtifactIndexPath,
	resolveSessionArtifactsDir
} from '@penny/shared/penny-paths';

import { buildArtifactSseForToolDone } from './artifact-sse-bridge.js';
import {
	artifactPdfExists,
	getArtifactMeta,
	listSessionArtifactSummaries,
	listSessionArtifacts
} from './artifact-storage.js';

const SESSION_KEY = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440000';
const SESSION_UUID = '550e8400-e29b-41d4-a716-446655440000';
const ARTIFACT_ID = '662a0a41-3cce-46a0-a99c-abe1160e3865';

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
			latestVersion: 1,
			formatVersion: 5,
			pdfAvailable: true,
			triggerReason: 'auto' as const,
			createdAt: '2026-05-24T12:00:00.000Z',
			updatedAt: '2026-05-24T12:00:00.000Z',
			verification: {
				verifiedAt: '2026-05-24T12:00:00.000Z',
				urlsChecked: ['https://example.ca/program']
			}
		};

		const versionDir = resolveArtifactVersionDir(repoRoot, SESSION_UUID, ARTIFACT_ID, 1);
		await mkdir(versionDir, { recursive: true });
		await writeFile(join(artifactDir, META_FILENAME), `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
		await writeFile(
			resolveArtifactVersionFilePath(repoRoot, SESSION_UUID, ARTIFACT_ID, 1, PDF_FILENAME),
			'%PDF-1.4 test',
			'utf8'
		);
		await writeFile(
			resolveArtifactVersionFilePath(repoRoot, SESSION_UUID, ARTIFACT_ID, 1, VERSION_META_FILENAME),
			`${JSON.stringify({ version: 1, title: meta.title, createdAt: meta.updatedAt, pdfAvailable: true }, null, 2)}\n`,
			'utf8'
		);
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

	it('lists artifacts from disk when index.json is missing', async () => {
		const indexPath = resolveSessionArtifactIndexPath(repoRoot, SESSION_UUID);
		await rm(indexPath);

		const artifacts = await listSessionArtifacts(SESSION_KEY);
		expect(artifacts).toHaveLength(1);
		expect(artifacts[0]?.artifactId).toBe(ARTIFACT_ID);
	});

	it('getArtifactMeta falls back to meta.json when index is empty', async () => {
		const indexPath = resolveSessionArtifactIndexPath(repoRoot, SESSION_UUID);
		await rm(indexPath);

		const meta = await getArtifactMeta(SESSION_KEY, ARTIFACT_ID);
		expect(meta?.title).toBe('Test brief');
	});

	it('getArtifactMeta returns null for invalid artifact ids', async () => {
		const meta = await getArtifactMeta(SESSION_KEY, 'not-a-valid-uuid');
		expect(meta).toBeNull();
	});

	it('detects pdf from legacy root path and repairs into version folder', async () => {
		const versionPdf = resolveArtifactVersionFilePath(
			repoRoot,
			SESSION_UUID,
			ARTIFACT_ID,
			1,
			PDF_FILENAME
		);
		const legacyPdf = join(resolveSessionArtifactsDir(repoRoot, SESSION_UUID), ARTIFACT_ID, PDF_FILENAME);
		await rm(versionPdf, { force: true });
		await writeFile(legacyPdf, '%PDF-1.4 legacy', 'utf8');

		expect(await artifactPdfExists(SESSION_KEY, ARTIFACT_ID, 1)).toBe(true);

		const summaries = await listSessionArtifactSummaries(SESSION_KEY);
		expect(summaries[0]?.pdfAvailable).toBe(true);
	});
});
