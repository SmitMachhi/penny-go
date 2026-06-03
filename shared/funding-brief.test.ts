import assert from 'node:assert/strict';
import test from 'node:test';

import { MAX_FUNDING_BRIEF_PROGRAMS, validateFundingBriefContent, validateFundingBriefInput } from './funding-brief.ts';

const SESSION_UUID = '550e8400-e29b-41d4-a716-446655440000';

function buildProgram(index: number) {
	return {
		name: `Program ${index}`,
		whyFit: 'Fits the business profile.',
		whyNot: 'May require additional documentation.',
		benefitType: 'Grant',
		intakeStatus: 'Open',
		officialUrl: `https://example.ca/program-${index}`,
		confidence: 'verified_live',
		nextStep: 'Apply through the portal.'
	};
}

function buildValidBrief(programCount = 1) {
	return {
		sessionUuid: SESSION_UUID,
		title: 'Ontario SaaS funding brief',
		triggerReason: 'auto',
		bodyMarkdown: '# Ontario SaaS funding brief\n\n## This week\n\n- [ ] Call IRAP advisor\n\n{{program:0}}',
		business: {
			name: 'Acme SaaS',
			province: 'Ontario',
			sector: 'Software'
		},
		programs: Array.from({ length: programCount }, (_, index) => buildProgram(index + 1)),
		verification: {
			verifiedAt: '2026-05-24T12:00:00.000Z',
			urlsChecked: ['https://example.ca/program-1']
		}
	};
}

function buildValidBriefContent(programCount = 1) {
	const brief = buildValidBrief(programCount);
	const { sessionUuid: _sessionUuid, ...content } = brief;
	return content;
}

test('validateFundingBriefContent accepts agent-facing brief without sessionUuid', () => {
	const result = validateFundingBriefContent(buildValidBriefContent(2));
	assert.equal(result.ok, true);
	if (result.ok) {
		assert.equal(result.value.programs.length, 2);
		assert.match(result.value.bodyMarkdown, /Call IRAP advisor/);
	}
});

test('validateFundingBriefInput accepts a valid brief', () => {
	const result = validateFundingBriefInput(buildValidBrief(2));
	assert.equal(result.ok, true);
	if (result.ok) {
		assert.equal(result.value.programs.length, 2);
		assert.equal(result.value.triggerReason, 'auto');
	}
});

test('validateFundingBriefInput rejects missing bodyMarkdown', () => {
	const input = buildValidBrief(1) as Record<string, unknown>;
	delete input.bodyMarkdown;
	const result = validateFundingBriefInput(input);
	assert.equal(result.ok, false);
	if (!result.ok) {
		assert.ok(result.errors.some((error) => error.field === 'bodyMarkdown'));
	}
});

test('validateFundingBriefInput rejects empty programs', () => {
	const input = buildValidBrief(0);
	input.programs = [];
	const result = validateFundingBriefInput(input);
	assert.equal(result.ok, false);
	if (!result.ok) {
		assert.ok(result.errors.some((error) => error.field === 'programs'));
	}
});

test('validateFundingBriefInput rejects more than max programs', () => {
	const result = validateFundingBriefInput(buildValidBrief(MAX_FUNDING_BRIEF_PROGRAMS + 1));
	assert.equal(result.ok, false);
	if (!result.ok) {
		assert.ok(result.errors.some((error) => error.field === 'programs'));
	}
});

test('validateFundingBriefInput rejects invalid official URL', () => {
	const input = buildValidBrief(1);
	input.programs[0].officialUrl = 'not-a-url';
	const result = validateFundingBriefInput(input);
	assert.equal(result.ok, false);
	if (!result.ok) {
		assert.ok(
			result.errors.some((error) => error.field === 'programs[0].officialUrl')
		);
	}
});

test('validateFundingBriefInput rejects strategy without actionable content', () => {
	const input = buildValidBrief(1);
	input.bodyMarkdown = 'Summary only with no checklist or numbered steps.';
	input.programs[0].nextStep = undefined;
	input.programs[0].steps = undefined;
	const result = validateFundingBriefInput(input);
	assert.equal(result.ok, false);
});

test('validateFundingBriefInput rejects invalid session UUID', () => {
	const input = buildValidBrief(1);
	input.sessionUuid = 'not-a-uuid';
	const result = validateFundingBriefInput(input);
	assert.equal(result.ok, false);
	if (!result.ok) {
		assert.ok(result.errors.some((error) => error.field === 'sessionUuid'));
	}
});
