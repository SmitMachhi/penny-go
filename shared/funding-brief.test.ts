import assert from 'node:assert/strict';
import test from 'node:test';

import { MAX_FUNDING_BRIEF_PROGRAMS, validateFundingBriefInput } from './funding-brief.ts';

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

test('validateFundingBriefInput accepts a valid brief', () => {
	const result = validateFundingBriefInput(buildValidBrief(2));
	assert.equal(result.ok, true);
	if (result.ok) {
		assert.equal(result.value.programs.length, 2);
		assert.equal(result.value.triggerReason, 'auto');
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

test('validateFundingBriefInput rejects invalid session UUID', () => {
	const input = buildValidBrief(1);
	input.sessionUuid = 'not-a-uuid';
	const result = validateFundingBriefInput(input);
	assert.equal(result.ok, false);
	if (!result.ok) {
		assert.ok(result.errors.some((error) => error.field === 'sessionUuid'));
	}
});
