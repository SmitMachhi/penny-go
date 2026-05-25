#!/usr/bin/env node
/**
 * Smoke test: create_funding_brief writes HTML + optional PDF under workspace/artifacts.
 * Usage: PENNY_REPO_ROOT=/path/to/penny-go node scripts/verify-artifact-create.mjs
 */
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createFundingBriefAction } from '../plugin/dist/actions/funding-brief-tools.js';

const SESSION_UUID = '550e8400-e29b-41d4-a716-446655440000';

const sampleBrief = {
	sessionUuid: SESSION_UUID,
	title: 'Artifact verification brief',
	triggerReason: 'auto',
	business: {
		name: 'Verify Co',
		province: 'Ontario',
		sector: 'Software'
	},
	programs: [
		{
			name: 'SR&ED',
			whyFit: 'Supports experimental development.',
			whyNot: 'Requires eligible R&D documentation.',
			benefitType: 'Tax credit',
			intakeStatus: 'Open',
			officialUrl: 'https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program.html',
			confidence: 'verified_live',
			nextStep: 'Review CRA eligibility guidance.'
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
	console.error(JSON.stringify(result, null, 2));
	process.exit(1);
}

const slidesPath = result.previewPath;
const pdfPath = result.pdfPath;
const slidesStat = await stat(slidesPath);
const slides = await readFile(slidesPath, 'utf8');

if (slidesStat.size <= 0 || !slides.includes('Artifact verification brief')) {
	console.error('slides.html missing expected content');
	process.exit(1);
}

let pdfOk = false;
try {
	const pdfStat = await stat(pdfPath);
	pdfOk = pdfStat.size > 0;
} catch {
	pdfOk = false;
}

const updateResult = await createFundingBriefAction(config, {
	...sampleBrief,
	artifactId: result.artifactId,
	title: 'Artifact verification brief v2',
	triggerReason: 'user_requested'
});

if (!updateResult.success || updateResult.version !== 2) {
	console.error('artifact update failed', updateResult);
	process.exit(1);
}

console.log(
	JSON.stringify(
		{
			ok: true,
			artifactId: result.artifactId,
			slidesPath,
			pdfPath,
			pdfOk,
			version: updateResult.version
		},
		null,
		2
	)
);
