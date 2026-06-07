import assert from 'node:assert/strict';
import test from 'node:test';

import {
	buildVerificationAppendix,
	composePdfMarkdown,
	stripOutOfScopeDisclaimerSection
} from './artifact-markdown.ts';
import type { ArtifactMetaRecord } from './artifact-types.ts';
import {
	ARTIFACT_FORMAT_VERSION,
	validateCreateFundingArtifactInput
} from './artifact-validation.ts';
import { renderMarkdownToPrintHtml, splitInlineCoverFacts } from './artifact-print-html.ts';

const SAMPLE_META: ArtifactMetaRecord = {
	artifactId: '6ba7b814-9dad-41d4-a716-446655440000',
	sessionUuid: '550e8400-e29b-41d4-a716-446655440000',
	title: 'Ontario SaaS funding',
	latestVersion: 1,
	formatVersion: ARTIFACT_FORMAT_VERSION,
	triggerReason: 'auto',
	createdAt: '2026-06-02T12:00:00.000Z',
	updatedAt: '2026-06-02T12:00:00.000Z',
	programCount: 1,
	verification: {
		verifiedAt: '2026-06-02T11:00:00.000Z',
		urlsChecked: ['https://example.ca/program']
	},
	evidence: {
		programs: [
			{
				name: 'IRAP',
				officialUrl: 'https://example.ca/program',
				confidence: 'verified_live',
				verdict: 'pursue_now'
			}
		]
	}
};

function buildValidInput() {
	return {
		title: 'Ontario SaaS funding',
		triggerReason: 'auto' as const,
		bodyMarkdown: `# Brief\n\n## Strategy\n\n- [ ] Call advisor\n`,
		verification: {
			verifiedAt: '2026-06-02T11:00:00.000Z',
			urlsChecked: ['https://example.ca/program']
		},
		evidence: {
			programs: [
				{
					name: 'IRAP',
					officialUrl: 'https://example.ca/program',
					confidence: 'verified_live' as const,
					verdict: 'pursue_now' as const
				}
			]
		}
	};
}

test('validateCreateFundingArtifactInput accepts markdown with checklist', () => {
	const result = validateCreateFundingArtifactInput(buildValidInput());
	assert.equal(result.ok, true);
});

test('validateCreateFundingArtifactInput rejects program memo without evidence programs', () => {
	const input = buildValidInput();
	input.bodyMarkdown = [
		'# Ontario SaaS funding',
		'',
		'## Strong fits',
		'',
		'### 1. IRAP',
		'',
		'**Fit:** Strong',
		'',
		'1. Call an ITA this week.'
	].join('\n');
	input.evidence.programs = [];

	const result = validateCreateFundingArtifactInput(input);

	assert.equal(result.ok, false);
	if (!result.ok) {
		assert.ok(result.errors.some((error) => error.field === 'evidence.programs'));
	}
});

test('validateCreateFundingArtifactInput rejects actionable program without verdict', () => {
	const input = buildValidInput();
	const [program] = input.evidence.programs;
	delete (program as Partial<typeof program>).verdict;
	const result = validateCreateFundingArtifactInput(input);

	assert.equal(result.ok, false);
	if (!result.ok) {
		assert.ok(result.errors.some((error) => error.field === 'evidence.programs[0].verdict'));
	}
});

test('validateCreateFundingArtifactInput rejects unverified actionable program', () => {
	const input = buildValidInput();
	input.evidence.programs[0].confidence = 'could_not_verify';
	const result = validateCreateFundingArtifactInput(input);

	assert.equal(result.ok, false);
	if (!result.ok) {
		assert.ok(result.errors.some((error) => error.field === 'evidence.programs[0].confidence'));
	}
});

test('validateCreateFundingArtifactInput rejects actionable loan-like program sections', () => {
	const input = buildValidInput();
	input.bodyMarkdown = [
		'# Newfoundland film funding',
		'',
		'## Conditional fits',
		'',
		'### 1. PictureNL Development Loan Program',
		'',
		'**Verdict:** Explore',
		'',
		'This is a repayable advance for production work.',
		'',
		'1. Contact the program officer.'
	].join('\n');
	input.evidence.programs[0] = {
		name: 'PictureNL Development Loan Program',
		officialUrl: 'https://example.ca/picturenl-loan',
		confidence: 'verified_live',
		verdict: 'explore'
	};

	const result = validateCreateFundingArtifactInput(input);

	assert.equal(result.ok, false);
	if (!result.ok) {
		assert.ok(result.errors.some((error) => error.field === 'bodyMarkdown'));
	}
});

test('validateCreateFundingArtifactInput rejects numbered h2 loan-like program sections', () => {
	const input = buildValidInput();
	input.bodyMarkdown = [
		'# Northern manufacturing funding',
		'',
		'## 1. CanNor IDEANorth — Best overall fit (repayable contribution)',
		'',
		'**Fit:** Strong',
		'',
		'**Type:** Repayable contribution for for-profit companies',
		'',
		'1. Contact the program officer.'
	].join('\n');
	input.evidence.programs[0] = {
		name: 'CanNor IDEANorth',
		officialUrl: 'https://example.ca/cannor',
		confidence: 'verified_live',
		verdict: 'pursue_now'
	};

	const result = validateCreateFundingArtifactInput(input);

	assert.equal(result.ok, false);
	if (!result.ok) {
		assert.ok(result.errors.some((error) => error.field === 'bodyMarkdown'));
	}
});

test('validateCreateFundingArtifactInput rejects additional loan-interest support sections', () => {
	const input = buildValidInput();
	input.bodyMarkdown = [
		'# NWT food manufacturing funding',
		'',
		'## Strong fits',
		'',
		'### 1. NWT SEED Strategic Investments',
		'',
		'**Verdict:** Pursue now',
		'',
		'This is a non-repayable grant for equipment.',
		'',
		'## Additional NWT Program Worth Knowing',
		'',
		'SEED Sector Support can add support to offset loan interest if you finance the rest.',
		'',
		'1. Call GNWT ITI to discuss Strategic Investments and Sector Support.'
	].join('\n');

	const result = validateCreateFundingArtifactInput(input);

	assert.equal(result.ok, false);
	if (!result.ok) {
		assert.ok(result.errors.some((error) => error.field === 'bodyMarkdown'));
	}
});

test('validateCreateFundingArtifactInput allows loan-like language when ruled out', () => {
	const input = buildValidInput();
	input.bodyMarkdown = [
		'# Newfoundland film funding',
		'',
		'## Ruled out',
		'',
		'### PictureNL Development Loan Program',
		'',
		'**Why not:** The page describes a loan and repayable advance, so it is outside scope.',
		'',
		'1. Use non-repayable tax-credit and grant paths instead.'
	].join('\n');
	input.evidence.programs[0] = {
		name: 'PictureNL Development Loan Program',
		officialUrl: 'https://example.ca/picturenl-loan',
		confidence: 'verified_live',
		verdict: 'skip'
	};

	const result = validateCreateFundingArtifactInput(input);

	assert.equal(result.ok, true);
});

test('validateCreateFundingArtifactInput allows loan-like language in does-not-fit section', () => {
	const input = buildValidInput();
	input.bodyMarkdown = [
		'# Nova Scotia circular economy funding',
		'',
		'## Programs & Incentives',
		'',
		'### 1. Divert NS Value-Added Manufacturing',
		'',
		'**Verdict:** Explore',
		'',
		'It is a grant, not a loan.',
		'',
		'## What doesn\'t fit at this stage',
		'',
		'### ACOA Business Development Program',
		'',
		'**Why not:** Repayable contributions are excluded by scope.',
		'',
		'1. Contact Divert NS first.'
	].join('\n');
	input.evidence.programs[0] = {
		name: 'Divert NS Value-Added Manufacturing',
		officialUrl: 'https://example.ca/divert',
		confidence: 'verified_live',
		verdict: 'explore'
	};

	const result = validateCreateFundingArtifactInput(input);

	assert.equal(result.ok, true);
});

test('validateCreateFundingArtifactInput accepts legacy programs alias', () => {
	const input = buildValidInput();
	const { evidence: _evidence, ...rest } = input;
	const result = validateCreateFundingArtifactInput({
		...rest,
		programs: input.evidence?.programs
	});
	assert.equal(result.ok, true);
});

test('validateCreateFundingArtifactInput falls back to legacy programs when evidence is empty', () => {
	const input = buildValidInput();
	const result = validateCreateFundingArtifactInput({
		...input,
		evidence: {},
		programs: input.evidence?.programs
	});

	assert.equal(result.ok, true);
	if (!result.ok) {
		return;
	}
	assert.equal(result.value.evidence?.programs?.length, 1);
});

test('validateCreateFundingArtifactInput rejects missing actionable markdown', () => {
	const input = buildValidInput();
	input.bodyMarkdown = 'Summary only.';
	const result = validateCreateFundingArtifactInput(input);
	assert.equal(result.ok, false);
});

test('buildVerificationAppendix formats source links', () => {
	const appendix = buildVerificationAppendix(SAMPLE_META);
	assert.match(appendix, /## Verification/);
	assert.match(appendix, /example\.ca/);
});

test('stripOutOfScopeDisclaimerSection removes disclaimer heading block', () => {
	const input = [
		'# Plan',
		'',
		'## Recommendation',
		'Do the thing.',
		'',
		'## What This Plan Does Not Include',
		'- Loans',
		'- Legal advice',
		'',
		'## Programs to pursue',
		'### 1. IRAP'
	].join('\n');
	const stripped = stripOutOfScopeDisclaimerSection(input);
	assert.doesNotMatch(stripped, /What This Plan Does Not Include/i);
	assert.match(stripped, /## Programs to pursue/);
	assert.match(stripped, /## Recommendation/);
});

test('composePdfMarkdown appends verification after body', () => {
	const composed = composePdfMarkdown('# Brief\n\nBody', SAMPLE_META);
	assert.match(composed, /^# Brief/);
	assert.match(composed, /## Verification/);
});

test('composePdfMarkdown strips duplicate generated cover title and prepared line', () => {
	const composed = composePdfMarkdown(
		[
			'# Ontario SaaS funding',
			'',
			'**Prepared:** June 6, 2026',
			'**Business:** SaaS company',
			'',
			'## Recommendation',
			'Pursue the grant.'
		].join('\n'),
		SAMPLE_META
	);

	assert.doesNotMatch(composed, /^# Ontario SaaS funding/m);
	assert.doesNotMatch(composed, /^\*\*Prepared:\*\*/m);
	assert.match(composed, /^\*\*Business:\*\* SaaS company/m);
	assert.match(composed, /## Recommendation/);
});

test('renderMarkdownToPrintHtml renders tables and task lists', () => {
	const html = renderMarkdownToPrintHtml('## Plan\n\n- [ ] Step one\n\n| Program | Fit |\n| --- | --- |\n| IRAP | Strong |', {
		title: 'Test',
		version: 1,
		preparedAt: '2026-06-02T12:00:00.000Z'
	});
	assert.match(html, /task-checkbox|<table/i);
	assert.match(html, /memo-cover/);
});

test('validateCreateFundingArtifactInput rejects long changeSummary', () => {
	const input = buildValidInput();
	input.changeSummary = 'x'.repeat(281);
	const result = validateCreateFundingArtifactInput(input);
	assert.equal(result.ok, false);
});

test('splitInlineCoverFacts breaks inline cover labels onto separate lines', () => {
	const input =
		'**Business:** Acme (NS) **Stage:** Pre-revenue **Target:** $1M **Strategy:** Grants stack';
	const split = splitInlineCoverFacts(input);
	assert.match(split, /\*\*Business:\*\* Acme \(NS\)\n\n\*\*Stage:\*\*/);
	assert.match(split, /\*\*Strategy:\*\* Grants stack$/);
});

test('renderMarkdownToPrintHtml splits inline cover facts into separate paragraphs', () => {
	const html = renderMarkdownToPrintHtml(
		'**Business:** Acme (NS) **Stage:** Pre-revenue **Target:** $1M **Strategy:** Grants stack',
		{ title: 'Test', version: 1, preparedAt: '2026-06-02T12:00:00.000Z' }
	);
	const factParagraphs = html.match(/<p class="memo-cover__fact">/g) ?? [];
	assert.equal(factParagraphs.length, 4);
});

test('renderMarkdownToPrintHtml highlights verdict and next step', () => {
	const html = renderMarkdownToPrintHtml(
		'**Verdict:** Pursue now\n\n**Next step:** Call advisor',
		{ title: 'Test', version: 1, preparedAt: '2026-06-02T12:00:00.000Z' }
	);
	assert.match(html, /artifact-verdict--pursue/);
	assert.match(html, /artifact-next-step/);
});

test('renderMarkdownToPrintHtml closes program blocks before later sections', () => {
	const html = renderMarkdownToPrintHtml(
		[
			'## Programs to pursue',
			'',
			'### 1. IRAP',
			'',
			'**Verdict:** Pursue now',
			'',
			'### 2. CanExport',
			'',
			'**Verdict:** Explore',
			'',
			'## Strategy',
			'',
			'Call advisors this week.'
		].join('\n'),
		{ title: 'Test', version: 1, preparedAt: '2026-06-02T12:00:00.000Z' }
	);

	assert.doesNotMatch(html, /<\/section><section class="program-block"><h3>1\./);
	assert.match(
		html,
		/<section class="program-block"><h3>2\. CanExport<\/h3>[\s\S]*?<\/section>\s*<h2>Strategy<\/h2>/
	);
});

test('renderMarkdownToPrintHtml strips active html before printing', () => {
	const html = renderMarkdownToPrintHtml(
		[
			'[bad link](javascript:alert(1))',
			'<img src="http://169.254.169.254/latest" onerror="alert(1)">',
			'<iframe src="https://example.ca"></iframe>',
			'<span onclick="alert(1)">Safe text</span>'
		].join('\n\n'),
		'Unsafe <title>'
	);

	assert.doesNotMatch(html, /javascript:/i);
	assert.doesNotMatch(html, /<img|<iframe|onerror|onclick/i);
	assert.match(html, /Safe text/);
	assert.match(html, /Unsafe &lt;title&gt;/);
});
