import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import { validateCreateFundingArtifactInput } from '@penny/shared/artifact-validation';
import {
	DOCUMENT_MD_FILENAME,
	META_FILENAME,
	PDF_FILENAME,
	resolveArtifactVersionFilePath
} from '@penny/shared/penny-paths';

import {
	buildArtifactMetaRecord,
	createArtifactId,
	loadArtifactMetaRecord,
	persistArtifactFilesAllowPdfFailure
} from './services/artifact-storage.js';

const SESSION_UUID = '550e8400-e29b-41d4-a716-446655440000';
const FAKE_PDF_BYTES = 'rendered pdf bytes';
const EXECUTABLE_FILE_MODE = 0o755;

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

async function writeFakePdfRenderer(repoRoot: string): Promise<string> {
	const fakePythonPath = join(repoRoot, 'fake-python');
	await writeFile(
		fakePythonPath,
		`#!/usr/bin/env python3
import json
import sys

payload = json.loads(sys.stdin.read())
with open(payload["pdfPath"], "w", encoding="utf-8") as pdf:
    pdf.write("${FAKE_PDF_BYTES}")
print(json.dumps({"success": True}))
`,
		'utf8'
	);
	await chmod(fakePythonPath, EXECUTABLE_FILE_MODE);
	return fakePythonPath;
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
	assert.equal(meta.formatVersion, 5);
	assert.equal(meta.latestVersion, 1);
});

test('persistArtifactFilesAllowPdfFailure writes versioned document.md and meta.json', async () => {
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
	assert.match(result.documentPath, new RegExp(`versions/1/${DOCUMENT_MD_FILENAME}$`));
	assert.match(result.metaPath, new RegExp(`${META_FILENAME}$`));

	const documentMarkdown = await readFile(result.documentPath, 'utf8');
	assert.match(documentMarkdown, /Call IRAP/);

	const metaRaw = await readFile(result.metaPath, 'utf8');
	const meta = JSON.parse(metaRaw) as { title: string; formatVersion: number; latestVersion: number };
	assert.equal(meta.title, 'Ontario SaaS funding brief');
	assert.equal(meta.formatVersion, 5);
	assert.equal(meta.latestVersion, 1);
});

test('persistArtifactFilesAllowPdfFailure bumps latestVersion on update', async () => {
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
	assert.equal(stored?.latestVersion, 2);
	assert.equal(stored?.title, 'Updated brief');
	assert.equal(stored?.formatVersion, 5);

	const v1Document = resolveArtifactVersionFilePath(
		repoRoot,
		SESSION_UUID,
		artifactId,
		1,
		DOCUMENT_MD_FILENAME
	);
	const v1Markdown = await readFile(v1Document, 'utf8');
	assert.match(v1Markdown, /Ontario SaaS funding brief/);
});

test('persistArtifactFilesAllowPdfFailure keeps prior version pdf when update fails', async () => {
	const validation = validateCreateFundingArtifactInput(sampleArtifactInput());
	assert.equal(validation.ok, true);
	if (!validation.ok) {
		return;
	}

	const repoRoot = await mkdtemp(join(tmpdir(), 'penny-artifact-stale-pdf-'));
	const artifactId = '6ba7b814-9dad-41d4-a716-446655440000';
	const v1PdfPath = resolveArtifactVersionFilePath(
		repoRoot,
		SESSION_UUID,
		artifactId,
		1,
		PDF_FILENAME
	);
	await mkdir(dirname(v1PdfPath), { recursive: true });
	await writeFile(v1PdfPath, 'v1 pdf bytes', 'utf8');

	await persistArtifactFilesAllowPdfFailure({
		config: { repoRoot, pythonPath: '/nonexistent/python' },
		repoRoot,
		params: { ...validation.value, sessionUuid: SESSION_UUID, artifactId, title: 'Updated brief' },
		artifactId,
		version: 2,
		createdAt: '2026-05-24T12:00:00.000Z',
		updatedAt: '2026-05-24T13:00:00.000Z'
	});

	await assert.doesNotReject(stat(v1PdfPath));
	await assert.rejects(
		stat(resolveArtifactVersionFilePath(repoRoot, SESSION_UUID, artifactId, 2, PDF_FILENAME)),
		{ code: 'ENOENT' }
	);
	const stored = await loadArtifactMetaRecord(repoRoot, SESSION_UUID, artifactId);
	assert.equal(stored?.title, 'Updated brief');
	assert.equal(stored?.pdfAvailable, false);
});

test('persistArtifactFilesAllowPdfFailure writes versioned pdf when renderer succeeds', async () => {
	const validation = validateCreateFundingArtifactInput(sampleArtifactInput());
	assert.equal(validation.ok, true);
	if (!validation.ok) {
		return;
	}

	const repoRoot = await mkdtemp(join(tmpdir(), 'penny-artifact-pdf-'));
	const fakePythonPath = await writeFakePdfRenderer(repoRoot);
	const artifactId = '6ba7b814-9dad-41d4-a716-446655440000';

	const result = await persistArtifactFilesAllowPdfFailure({
		config: { repoRoot, pythonPath: fakePythonPath },
		repoRoot,
		params: { ...validation.value, sessionUuid: SESSION_UUID, artifactId },
		artifactId,
		version: 1,
		createdAt: '2026-05-24T12:00:00.000Z',
		updatedAt: '2026-05-24T12:00:00.000Z'
	});

	assert.equal(result.pdfOk, true);
	const pdfPath = resolveArtifactVersionFilePath(repoRoot, SESSION_UUID, artifactId, 1, PDF_FILENAME);
	assert.equal(await readFile(pdfPath, 'utf8'), FAKE_PDF_BYTES);
	const stored = await loadArtifactMetaRecord(repoRoot, SESSION_UUID, artifactId);
	assert.equal(stored?.pdfAvailable, true);
	assert.equal(stored?.latestVersion, 1);
});
