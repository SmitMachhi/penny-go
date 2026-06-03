#!/usr/bin/env node
/**
 * Smoke test: create_funding_brief writes document.md + brief.pdf under workspace/artifacts.
 * Usage: PENNY_REPO_ROOT=/path/to/penny-go node scripts/verify-artifact-create.mjs
 * Set PENNY_SKIP_PDF=1 to accept document-only success when Playwright is unavailable.
 */
import { readFile, stat } from 'node:fs/promises';

import { DOCUMENT_MD_FILENAME, PDF_FILENAME } from '../shared/penny-paths.ts';
import { createFundingBriefAction } from '../plugin/dist/actions/funding-brief-tools.js';

const SESSION_UUID = '550e8400-e29b-41d4-a716-446655440000';
const SKIP_PDF = process.env.PENNY_SKIP_PDF === '1';

const sampleBrief = {
	sessionUuid: SESSION_UUID,
	title: 'Artifact verification brief',
	triggerReason: 'auto',
	bodyMarkdown: `# Artifact verification brief

Verification smoke test for markdown → PDF rendering.

## Next steps

- [ ] Review SR&ED eligibility guidance
- [ ] Schedule advisor call this week

## SR&ED

Federal tax incentive for eligible R&D.`,
	programs: [
		{
			name: 'SR&ED',
			officialUrl:
				'https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program.html',
			confidence: 'verified_live'
		}
	],
	verification: {
		verifiedAt: new Date().toISOString(),
		urlsChecked: [
			'https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program.html'
		]
	}
};

const repoRoot = process.env.PENNY_REPO_ROOT?.trim();
if (!repoRoot) {
	console.error('PENNY_REPO_ROOT is required');
	process.exit(1);
}

process.env.PENNY_REPO_ROOT = repoRoot;

const config = {
	repoRoot,
	pythonPath: process.env.PENNY_PYTHON?.trim() || 'python3'
};

const result = await createFundingBriefAction(config, sampleBrief);
if (!result.success) {
	if (!SKIP_PDF || !('documentPath' in result) || !result.documentPath) {
		console.error(JSON.stringify(result, null, 2));
		process.exit(1);
	}
}

const artifactId = result.artifactId;
const documentPath = 'documentPath' in result ? result.documentPath : undefined;
const pdfPath = 'pdfPath' in result ? result.pdfPath : undefined;

if (!documentPath) {
	console.error('missing documentPath in tool result');
	process.exit(1);
}

const documentStat = await stat(documentPath);
const documentMarkdown = await readFile(documentPath, 'utf8');

if (documentStat.size <= 0 || !documentMarkdown.includes('Artifact verification brief')) {
	console.error(`${DOCUMENT_MD_FILENAME} missing expected content`);
	process.exit(1);
}

if (!documentMarkdown.includes('- [ ]')) {
	console.error(`${DOCUMENT_MD_FILENAME} missing checklist items`);
	process.exit(1);
}

let pdfOk = false;
if (pdfPath) {
	try {
		const pdfStat = await stat(pdfPath);
		pdfOk = pdfStat.size > 0;
	} catch {
		pdfOk = false;
	}
}

if (!pdfOk && !SKIP_PDF) {
	console.error(`${PDF_FILENAME} was not generated — set PENNY_SKIP_PDF=1 if Playwright is unavailable`);
	process.exit(1);
}

const updateResult = await createFundingBriefAction(config, {
	...sampleBrief,
	artifactId,
	title: 'Artifact verification brief v2',
	triggerReason: 'user_requested'
});

const updateOk = updateResult.success || (SKIP_PDF && 'documentPath' in updateResult);
if (!updateOk || updateResult.version !== 2) {
	console.error('artifact update failed', updateResult);
	process.exit(1);
}

console.log(
	JSON.stringify(
		{
			ok: true,
			artifactId,
			documentPath,
			pdfPath: pdfPath ?? null,
			pdfOk,
			skipPdf: SKIP_PDF,
			version: updateResult.version
		},
		null,
		2
	)
);
