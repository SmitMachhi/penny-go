import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPennySessionKey } from '@penny/shared/session-key';

import { createFundingBriefTool } from './tools/create-funding-brief-tool.js';

const SESSION_UUID = '550e8400-e29b-41d4-a716-446655440000';
const SESSION_KEY = buildPennySessionKey(SESSION_UUID);

const sampleParams = {
	title: 'Ontario SaaS funding brief',
	triggerReason: 'user_requested' as const,
	bodyMarkdown:
		'# Ontario SaaS funding brief\n\n## Plan\n\n- [ ] Review IRAP intake requirements\n\n1. Call an ITA this week.',
	programs: [
		{
			name: 'IRAP',
			officialUrl: 'https://nrc.canada.ca/en/support-technology-innovation',
			confidence: 'verified_live' as const
		}
	],
	verification: {
		verifiedAt: '2026-05-24T12:00:00.000Z',
		urlsChecked: ['https://nrc.canada.ca/en/support-technology-innovation']
	}
};

test('createFundingBriefTool rejects missing penny session key', async () => {
	const tool = createFundingBriefTool({ repoRoot: '/tmp/penny-go' }, 'agent:main:main');
	const result = await tool.execute('call-1', sampleParams);
	const details = result.details as Record<string, unknown>;
	assert.equal(details.success, false);
	assert.equal(details.error, 'invalid_session_key');
});

test('createFundingBriefTool rejects markdown without actionable steps', async () => {
	const tool = createFundingBriefTool({ repoRoot: '/tmp/penny-go' }, SESSION_KEY);
	const result = await tool.execute('call-2', {
		...sampleParams,
		bodyMarkdown: '# Summary only\n\nNo checklist here.'
	});
	const details = result.details as Record<string, unknown>;
	assert.equal(details.success, false);
	assert.equal(details.error, 'validation_failed');
});
