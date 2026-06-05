import assert from 'node:assert/strict';
import test from 'node:test';

import {
	classifyFundingBenefitScope,
	containsActionableLoanLikeLanguage,
	stripRuledOutMarkdownSections
} from './funding-benefit-scope.ts';

test('classifies explicit grants and rebates as allowed', () => {
	assert.deepEqual(classifyFundingBenefitScope('non-repayable grant'), {
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
	assert.equal(containsActionableLoanLikeLanguage('No loans or repayable contributions in the mix.'), false);
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
