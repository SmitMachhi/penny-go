import assert from 'node:assert/strict';
import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import {
	repairVersionPdfFromLegacy,
	resolveArtifactPdfPaths,
	resolveReadableArtifactPdfPath
} from './artifact-pdf-locations.ts';
import { PDF_FILENAME, resolveArtifactVersionDir } from './penny-paths.ts';

const SESSION_UUID = '550e8400-e29b-41d4-a716-446655440000';
const ARTIFACT_ID = '6ba7b814-9dad-41d4-a716-446655440000';

test('repairVersionPdfFromLegacy copies root pdf into version folder', async () => {
	const repoRoot = await mkdtemp(join(tmpdir(), 'penny-artifact-pdf-'));
	const versionDir = resolveArtifactVersionDir(repoRoot, SESSION_UUID, ARTIFACT_ID, 1);
	const paths = resolveArtifactPdfPaths(repoRoot, SESSION_UUID, ARTIFACT_ID, 1);

	try {
		await mkdir(versionDir, { recursive: true });
		await writeFile(paths.legacyPath, '%PDF-1.4 legacy', 'utf8');

		const repaired = await repairVersionPdfFromLegacy(paths);
		assert.equal(repaired, true);

		const resolved = await resolveReadableArtifactPdfPath(paths);
		assert.equal(resolved, paths.versionPath);
	} finally {
		await rm(repoRoot, { recursive: true, force: true });
	}
});

test('repairVersionPdfFromLegacy creates missing version folder for legacy pdf', async () => {
	const repoRoot = await mkdtemp(join(tmpdir(), 'penny-artifact-pdf-'));
	const paths = resolveArtifactPdfPaths(repoRoot, SESSION_UUID, ARTIFACT_ID, 1);

	try {
		await mkdir(dirname(paths.legacyPath), { recursive: true });
		await writeFile(paths.legacyPath, '%PDF-1.4 legacy', 'utf8');

		const repaired = await repairVersionPdfFromLegacy(paths);
		assert.equal(repaired, true);

		const resolved = await resolveReadableArtifactPdfPath(paths);
		assert.equal(resolved, paths.versionPath);
	} finally {
		await rm(repoRoot, { recursive: true, force: true });
	}
});
