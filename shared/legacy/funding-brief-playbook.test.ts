import assert from 'node:assert/strict';
import test from 'node:test';

import { renderProgramPlaybookHtml } from './funding-brief-playbook.ts';
import type { FundingBriefProgram } from './funding-brief-types.ts';

const BASE_PROGRAM: FundingBriefProgram = {
	name: 'IRAP',
	benefitType: 'Grant',
	intakeStatus: 'Open',
	officialUrl: 'https://nrc.canada.ca/en/support-technology-innovation',
	confidence: 'verified_live',
	verdict: 'pursue_now',
	plainTerms: 'Advisor-led R&D support for innovative SMEs.',
	steps: ['Call 1-877-994-4727', 'Meet your ITA', 'Submit project scope'],
	prerequisites: ['Canadian incorporation', 'Fewer than 500 employees'],
	documents: ['Project budget', 'R&D work plan'],
	timeline: '4–8 weeks to initial advisor meeting',
	fallback: 'Explore provincial innovation vouchers if IRAP scope is too narrow.'
};

test('renderProgramPlaybookHtml includes verdict and numbered steps', () => {
	const html = renderProgramPlaybookHtml(BASE_PROGRAM);
	assert.match(html, /Pursue now/);
	assert.match(html, /Before you apply/);
	assert.match(html, /Call 1-877-994-4727/);
	assert.match(html, /If this doesn\u2019t work/);
	assert.match(html, /playbook-steps/);
});

test('renderProgramPlaybookHtml omits empty optional sections', () => {
	const html = renderProgramPlaybookHtml({
		...BASE_PROGRAM,
		verdict: undefined,
		prerequisites: undefined,
		documents: undefined,
		fallback: undefined,
		steps: undefined,
		nextStep: 'Contact IRAP.'
	});
	assert.doesNotMatch(html, /Before you apply/);
	assert.match(html, /Next step/);
	assert.match(html, /Contact IRAP/);
});
