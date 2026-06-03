import assert from 'node:assert/strict';
import test from 'node:test';

import { composePdfMarkdown, buildVerificationAppendix } from './artifact-markdown.ts';
import type { ArtifactMetaRecord } from './artifact-types.ts';
import {
	ARTIFACT_FORMAT_VERSION,
	validateCreateFundingArtifactInput
} from './artifact-validation.ts';
import { renderMarkdownToPrintHtml } from './artifact-print-html.ts';

const SAMPLE_META: ArtifactMetaRecord = {
	artifactId: '6ba7b814-9dad-41d4-a716-446655440000',
	sessionUuid: '550e8400-e29b-41d4-a716-446655440000',
	title: 'Ontario SaaS funding',
	version: 1,
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

test('composePdfMarkdown appends verification after body', () => {
	const composed = composePdfMarkdown('# Brief\n\nBody', SAMPLE_META);
	assert.match(composed, /^# Brief/);
	assert.match(composed, /## Verification/);
});

test('renderMarkdownToPrintHtml renders tables and task lists', () => {
	const html = renderMarkdownToPrintHtml(
		'## Plan\n\n- [ ] Step one\n\n| Program | Fit |\n| --- | --- |\n| IRAP | Strong |',
		'Test'
	);
	assert.match(html, /task-checkbox|<table/i);
});
