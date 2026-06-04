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
				confidence: 'verified_live'
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
					confidence: 'verified_live' as const
				}
			]
		}
	};
}

test('validateCreateFundingArtifactInput accepts markdown with checklist', () => {
	const result = validateCreateFundingArtifactInput(buildValidInput());
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
