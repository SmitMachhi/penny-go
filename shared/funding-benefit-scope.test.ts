import assert from 'node:assert/strict';
import test from 'node:test';

import {
	classifyFundingBenefitScope,
	containsActionableLoanLikeLanguage,
	findActionableLoanLikeEvidence,
	stripRuledOutMarkdownSections
} from './funding-benefit-scope.ts';

test('classifies explicit grants and rebates as allowed', () => {
	assert.deepEqual(classifyFundingBenefitScope('non-repayable grant'), {
		allowed: true,
		reason: 'non_loan'
	});
	assert.deepEqual(classifyFundingBenefitScope('non-repayable contribution'), {
		allowed: true,
		reason: 'non_loan'
	});
	assert.deepEqual(classifyFundingBenefitScope('refundable tax credit and wage subsidy'), {
		allowed: true,
		reason: 'non_loan'
	});
});

test('classifies loan-like benefits as ruled out', () => {
	assert.equal(classifyFundingBenefitScope('interest-free repayable contribution').allowed, false);
	assert.equal(classifyFundingBenefitScope('loan guarantee for working capital').allowed, false);
	assert.equal(classifyFundingBenefitScope('offset loan interest on new equipment').allowed, false);
	assert.equal(classifyFundingBenefitScope('forgivable loan').allowed, false);
});

test('does not treat negative wording as a loan recommendation', () => {
	assert.equal(containsActionableLoanLikeLanguage('This is not a loan.'), false);
	assert.equal(containsActionableLoanLikeLanguage('This is a non-repayable contribution.'), false);
	assert.equal(containsActionableLoanLikeLanguage('No loans or repayable contributions in the mix.'), false);
	assert.equal(
		containsActionableLoanLikeLanguage('CMHC Rental Construction Financing is a loan, not a grant. You said no loans.'),
		false
	);
	assert.equal(
		containsActionableLoanLikeLanguage('ACOA BDP is a repayable contribution worth a call.'),
		true
	);
	assert.equal(
		containsActionableLoanLikeLanguage(
			'IDEANorth is a repayable contribution for for-profits, but interest-free, not a bank loan.'
		),
		true
	);
});

test('does not treat explanatory ruled-out loan descriptions as recommendations', () => {
	const markdown = [
		'**ESSOR Volet 2 is primarily a loan program.**',
		'The available instruments are repayable contributions (loans, interest-free loans) and loan guarantees.',
		"If you're firm on non-loan only, ESSOR Volet 2 is a weak fit.",
		'**Non-loan alternatives worth your time:** Quebec Investment and Innovation Tax Credit.'
	].join('\n');

	assert.equal(containsActionableLoanLikeLanguage(markdown), false);
	assert.equal(findActionableLoanLikeEvidence(markdown), null);
});

test('strips ruled-out markdown before actionable loan scan', () => {
	const markdown = [
		'## Strong fits',
		'Non-repayable equipment grant.',
		'## Ruled out',
		'PictureNL Development Loan is a loan, so skip it.',
		'## Next steps',
		'Call the grant officer.'
	].join('\n');

	const stripped = stripRuledOutMarkdownSections(markdown);
	assert.match(stripped, /Strong fits/);
	assert.doesNotMatch(stripped, /Development Loan/);
	assert.equal(containsActionableLoanLikeLanguage(markdown), false);
});

test('strips does-not-fit markdown before actionable loan scan', () => {
	const markdown = [
		'## Strong fits',
		'Divert NS is a grant, not a loan.',
		'## What doesn\'t fit at this stage',
		'ACOA Business Development Program is a repayable contribution excluded by scope.',
		'## Next steps',
		'Call Divert NS.'
	].join('\n');

	const stripped = stripRuledOutMarkdownSections(markdown);
	assert.doesNotMatch(stripped, /ACOA Business Development/);
	assert.equal(containsActionableLoanLikeLanguage(markdown), false);
});

test('ignores loan language from link-heavy page chrome', () => {
	const markdown = [
		'# Export Development Program',
		'[Export Development Program](https://example.ca/export) [Business Loan Program](https://example.ca/loans) [Benefits](https://example.ca/benefits)',
		'The program reimburses eligible Manitoba companies for market research and trade shows.',
		'Eligible applicants may receive up to 75% reimbursement for approved costs.'
	].join('\n');

	assert.equal(containsActionableLoanLikeLanguage(markdown), false);
	assert.equal(findActionableLoanLikeEvidence(markdown), null);
});

test('returns source evidence for real program-body loan language', () => {
	const markdown = [
		'# Business Development Program',
		'Funding is provided as an interest-free repayable contribution for eligible expansion costs.'
	].join('\n');

	assert.deepEqual(findActionableLoanLikeEvidence(markdown), {
		match: 'repayable contribution',
		text: 'Funding is provided as an interest-free repayable contribution for eligible expansion costs.'
	});
	assert.equal(containsActionableLoanLikeLanguage(markdown), true);
});
