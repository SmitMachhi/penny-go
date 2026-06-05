import assert from 'node:assert/strict';
import test from 'node:test';

import heuristic from './loan-heuristic.json' with { type: 'json' };

const LOANLIKE_REGEX = new RegExp(heuristic.regex, 'iu');

function textLooksLoanBacked(textParts: readonly string[]): boolean {
	const blob = textParts.filter(Boolean).join(' ');
	return LOANLIKE_REGEX.test(blob);
}

test('loan heuristic rejects loan guarantee phrasing', () => {
	assert.equal(textLooksLoanBacked(['Loan guarantee up to $1m']), true);
});

test('loan heuristic rejects repayable and financing phrasing', () => {
	assert.equal(textLooksLoanBacked(['repayable contributions for for-profit businesses']), true);
	assert.equal(textLooksLoanBacked(['interest-free unsecured financing for startups']), true);
	assert.equal(textLooksLoanBacked(['grant offsets loan interest on equipment']), true);
});

test('loan heuristic allows non-repayable contribution wording', () => {
	assert.equal(textLooksLoanBacked(['Non-repayable contribution']), false);
});

test('audit field list includes provider', () => {
	assert.equal(heuristic.auditFields.includes('provider'), true);
});
