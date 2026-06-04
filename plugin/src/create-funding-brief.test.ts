import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import { validateCreateFundingArtifactInput } from '@penny/shared/artifact-validation';
import {
	DOCUMENT_MD_FILENAME,
	META_FILENAME,
	PDF_FILENAME,
	resolveArtifactFilePath
} from '@penny/shared/penny-paths';

import {
	buildArtifactMetaRecord,
	createArtifactId,
	loadArtifactMetaRecord,
	persistArtifactFilesAllowPdfFailure
} from './services/artifact-storage.js';

const SESSION_UUID = '550e8400-e29b-41d4-a716-446655440000';

function sampleArtifactInput() {
	return {
		sessionUuid: SESSION_UUID,
		title: 'Ontario SaaS funding brief',
		triggerReason: 'auto' as const,
		bodyMarkdown: `# Ontario SaaS funding brief

Acme SaaS is an Ontario software company exploring non-dilutive support for product R&D.

## Recommended path

- [ ] Call IRAP to confirm advisor assignment this week.`,
		evidence: {
			programs: [
				{
					name: 'IRAP',
					officialUrl: 'https://nrc.canada.ca/en/support-technology-innovation',
					confidence: 'verified_live' as const
				}
			]
		},
		verification: {
			verifiedAt: '2026-05-24T12:00:00.000Z',
			urlsChecked: ['https://nrc.canada.ca/en/support-technology-innovation']
		}
	};
}

test('buildArtifactMetaRecord derives programCount from evidence', () => {
	const validation = validateCreateFundingArtifactInput(sampleArtifactInput());
	assert.equal(validation.ok, true);
	if (!validation.ok) {
		return;
	}

	const meta = buildArtifactMetaRecord(
		{ ...validation.value, sessionUuid: SESSION_UUID },
		'6ba7b814-9dad-41d4-a716-446655440000',
		1,
		{
			createdAt: '2026-05-24T12:00:00.000Z',
			updatedAt: '2026-05-24T12:00:00.000Z'
		}
	);
	assert.equal(meta.programCount, 1);
	assert.equal(meta.formatVersion, 4);
});

test('persistArtifactFilesAllowPdfFailure writes document.md and meta.json', async () => {
	const validation = validateCreateFundingArtifactInput(sampleArtifactInput());
	assert.equal(validation.ok, true);
	if (!validation.ok) {
		return;
	}

	const repoRoot = await mkdtemp(join(tmpdir(), 'penny-artifact-'));
	const artifactId = createArtifactId();
	const params = { ...validation.value, sessionUuid: SESSION_UUID, artifactId };

	const result = await persistArtifactFilesAllowPdfFailure({
		config: { repoRoot, pythonPath: '/nonexistent/python' },
		repoRoot,
		params,
		artifactId,
		version: 1,
		createdAt: '2026-05-24T12:00:00.000Z',
		updatedAt: '2026-05-24T12:00:00.000Z'
	});

	assert.equal(result.pdfOk, false);
	assert.match(result.documentPath, new RegExp(`${DOCUMENT_MD_FILENAME}$`));
	assert.match(result.metaPath, new RegExp(`${META_FILENAME}$`));

	const documentMarkdown = await readFile(result.documentPath, 'utf8');
	assert.match(documentMarkdown, /Call IRAP/);

	const metaRaw = await readFile(result.metaPath, 'utf8');
	const meta = JSON.parse(metaRaw) as { title: string; formatVersion: number };
	assert.equal(meta.title, 'Ontario SaaS funding brief');
	assert.equal(meta.formatVersion, 4);
});

test('persistArtifactFilesAllowPdfFailure bumps version on update', async () => {
	const validation = validateCreateFundingArtifactInput(sampleArtifactInput());
	assert.equal(validation.ok, true);
	if (!validation.ok) {
		return;
	}

	const repoRoot = await mkdtemp(join(tmpdir(), 'penny-artifact-update-'));
	const artifactId = '6ba7b814-9dad-41d4-a716-446655440000';
	const baseParams = { ...validation.value, sessionUuid: SESSION_UUID, artifactId };

	await persistArtifactFilesAllowPdfFailure({
		config: { repoRoot, pythonPath: '/nonexistent/python' },
		repoRoot,
		params: baseParams,
		artifactId,
		version: 1,
		createdAt: '2026-05-24T12:00:00.000Z',
		updatedAt: '2026-05-24T12:00:00.000Z'
	});

	await persistArtifactFilesAllowPdfFailure({
		config: { repoRoot, pythonPath: '/nonexistent/python' },
		repoRoot,
		params: { ...baseParams, title: 'Updated brief' },
		artifactId,
		version: 2,
		createdAt: '2026-05-24T12:00:00.000Z',
		updatedAt: '2026-05-24T13:00:00.000Z'
	});

	const stored = await loadArtifactMetaRecord(repoRoot, SESSION_UUID, artifactId);
	assert.equal(stored?.version, 2);
	assert.equal(stored?.title, 'Updated brief');
	assert.equal(stored?.formatVersion, 4);
});

test('persistArtifactFilesAllowPdfFailure clears stale pdf on failed update', async () => {
	const validation = validateCreateFundingArtifactInput(sampleArtifactInput());
	assert.equal(validation.ok, true);
	if (!validation.ok) {
		return;
	}

	const repoRoot = await mkdtemp(join(tmpdir(), 'penny-artifact-stale-pdf-'));
	const artifactId = '6ba7b814-9dad-41d4-a716-446655440000';
	const pdfPath = resolveArtifactFilePath(repoRoot, SESSION_UUID, artifactId, PDF_FILENAME);
	await mkdir(dirname(pdfPath), { recursive: true });
	await writeFile(pdfPath, 'stale pdf bytes', 'utf8');

	await persistArtifactFilesAllowPdfFailure({
		config: { repoRoot, pythonPath: '/nonexistent/python' },
		repoRoot,
		params: { ...validation.value, sessionUuid: SESSION_UUID, artifactId, title: 'Updated brief' },
		artifactId,
		version: 2,
		createdAt: '2026-05-24T12:00:00.000Z',
		updatedAt: '2026-05-24T13:00:00.000Z'
	});

	await assert.rejects(stat(pdfPath), { code: 'ENOENT' });
	const stored = await loadArtifactMetaRecord(repoRoot, SESSION_UUID, artifactId);
	assert.equal(stored?.title, 'Updated brief');
	assert.equal(stored?.pdfAvailable, false);
});
