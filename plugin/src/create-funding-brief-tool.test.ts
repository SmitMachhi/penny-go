import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPennySessionKey } from '@penny/shared/session-key';

import { createFundingBriefTool } from './tools/create-funding-brief-tool.js';
import { publishFundingBriefTool } from './tools/publish-funding-brief-tool.js';

const SESSION_UUID = '550e8400-e29b-41d4-a716-446655440000';
const SESSION_KEY = buildPennySessionKey(SESSION_UUID);
const LOCAL_SESSION_KEY = 'penny-opportunity-backed';
const SCOPED_LOCAL_SESSION_KEY = `agent:main:${LOCAL_SESSION_KEY}`;
const SCOPED_EXPLICIT_LOCAL_SESSION_KEY = `agent:main:explicit:${LOCAL_SESSION_KEY}`;

const sampleParams = {
	title: 'Ontario SaaS funding brief',
	triggerReason: 'user_requested' as const,
	bodyMarkdown:
		'# Ontario SaaS funding brief\n\n## Plan\n\n- [ ] Review IRAP intake requirements\n\n1. Call an ITA this week.',
	programs: [
		{
			name: 'IRAP',
			officialUrl: 'https://nrc.canada.ca/en/support-technology-innovation',
			confidence: 'verified_live' as const,
			verdict: 'pursue_now' as const
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

test('createFundingBriefTool accepts local penny session ids before validation', async () => {
	const tool = createFundingBriefTool({ repoRoot: '/tmp/penny-go' }, LOCAL_SESSION_KEY);
	const result = await tool.execute('call-3', {
		...sampleParams,
		bodyMarkdown: '# Summary only\n\nNo checklist here.'
	});
	const details = result.details as Record<string, unknown>;
	assert.equal(details.success, false);
	assert.equal(details.error, 'validation_failed');
});

test('createFundingBriefTool rejects internal tool failure text', async () => {
	const tool = createFundingBriefTool({ repoRoot: '/tmp/penny-go' }, SESSION_KEY);
	const result = await tool.execute('call-3b', {
		...sampleParams,
		bodyMarkdown: [
			'# NorthBind Funding Plan',
			'',
			'## Ruled out',
			'',
			'- Page blocked by anti-bot protection; could not verify.',
			'',
			'1. Use a different source.'
		].join('\n')
	});
	const details = result.details as Record<string, unknown>;
	assert.equal(details.success, false);
	assert.equal(details.error, 'validation_failed');
});

test('createFundingBriefTool accepts scoped local penny session ids before validation', async () => {
	const tool = createFundingBriefTool({ repoRoot: '/tmp/penny-go' }, SCOPED_LOCAL_SESSION_KEY);
	const result = await tool.execute('call-4', {
		...sampleParams,
		bodyMarkdown: '# Summary only\n\nNo checklist here.'
	});
	const details = result.details as Record<string, unknown>;
	assert.equal(details.success, false);
	assert.equal(details.error, 'validation_failed');
});

test('createFundingBriefTool accepts scoped explicit local penny session ids', async () => {
	const tool = createFundingBriefTool(
		{ repoRoot: '/tmp/penny-go' },
		SCOPED_EXPLICIT_LOCAL_SESSION_KEY
	);
	const result = await tool.execute('call-5', {
		...sampleParams,
		bodyMarkdown: '# Summary only\n\nNo checklist here.'
	});
	const details = result.details as Record<string, unknown>;
	assert.equal(details.success, false);
	assert.equal(details.error, 'validation_failed');
});

test('publishFundingBriefTool fills strict artifact metadata from simple model args', async () => {
	const seen: Record<string, unknown>[] = [];
	const tool = publishFundingBriefTool(
		{ repoRoot: '/tmp/penny-go' },
		SESSION_KEY,
		async (_config, params) => {
			seen.push(params);
			return {
				success: false as const,
				error: 'pdf_render_failed',
				artifactId: '6ba7b814-9dad-41d4-a716-446655440000',
				sessionUuid: SESSION_UUID,
				documentPath: '/tmp/document.md',
				version: 1
			};
		}
	);

	const result = await tool.execute('call-6', {
		title: 'PEI cybersecurity funding brief',
		bodyMarkdown:
			'# PEI cybersecurity funding brief\n\n## Recommended path\n\n- [ ] Call SkillsPEI this week.',
		verifiedUrls: ['https://www.princeedwardisland.ca/en/service/employ-pei'],
		notes: 'PEI page was verified through Firecrawl official scrape fallback.'
	});

	const details = result.details as Record<string, unknown>;
	assert.equal(details.success, false);
	assert.equal(details.error, 'pdf_render_failed');
	assert.equal(seen.length, 1);
	assert.equal(seen[0]?.triggerReason, 'auto');
	assert.equal(seen[0]?.sessionUuid, SESSION_UUID);
	assert.deepEqual((seen[0]?.verification as { urlsChecked?: string[] }).urlsChecked, [
		'https://www.princeedwardisland.ca/en/service/employ-pei'
	]);
	assert.deepEqual((seen[0]?.evidence as { programs?: unknown[] }).programs, [
		{
			name: 'princeedwardisland.ca',
			officialUrl: 'https://www.princeedwardisland.ca/en/service/employ-pei',
			confidence: 'verified_live',
			verdict: 'explore'
		}
	]);
	assert.equal(typeof (seen[0]?.verification as { verifiedAt?: unknown }).verifiedAt, 'string');
	assert.equal(
		(seen[0]?.verification as { notes?: string }).notes,
		'PEI page was verified through Firecrawl official scrape fallback.'
	);
});
