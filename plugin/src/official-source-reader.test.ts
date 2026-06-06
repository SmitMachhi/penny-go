import assert from 'node:assert/strict';
import test from 'node:test';

import {
	clearOfficialSourceReadCacheForTests,
	detectBlockedSourceContent,
	readOfficialSourceWithFallback
} from './services/official-source-reader.js';
import { resolveExaApiKey } from './services/penny-config.js';

const OFFICIAL_URL = 'https://www.princeedwardisland.ca/en/service/employ-pei';
const EXA_KEY = 'exa-test-key';
const TEST_EXA_ENV_VAR = 'PENNY_TEST_EXA_KEY';

test('detectBlockedSourceContent catches Radware challenge text', () => {
	assert.equal(
		detectBlockedSourceContent('Radware Page\nVerifying your browser before proceeding...\nIncident ID: abc'),
		true
	);
});

test('resolveExaApiKey reads env-backed config markers', () => {
	const prior = process.env[TEST_EXA_ENV_VAR];
	process.env[TEST_EXA_ENV_VAR] = EXA_KEY;
	try {
		assert.equal(resolveExaApiKey({ exaApiKey: `env:${TEST_EXA_ENV_VAR}` }), EXA_KEY);
	} finally {
		if (prior === undefined) {
			delete process.env[TEST_EXA_ENV_VAR];
		} else {
			process.env[TEST_EXA_ENV_VAR] = prior;
		}
	}
});

test('readOfficialSourceWithFallback uses Exa contents when Crawl4AI is blocked', async () => {
	clearOfficialSourceReadCacheForTests();
	const calls: string[] = [];

	const result = await readOfficialSourceWithFallback({
		url: OFFICIAL_URL,
		exaApiKey: EXA_KEY,
		readWithCrawl4Ai: async () => {
			calls.push('crawl');
			return {
				success: true,
				url: OFFICIAL_URL,
				markdown: 'Radware Page\nVerifying your browser before proceeding...\nIncident ID: abc',
				fetched_at: '2026-06-06T20:44:25.270528+00:00'
			};
		},
		readWithExaContents: async () => {
			calls.push('exa');
			return {
				success: true,
				url: OFFICIAL_URL,
				markdown: '# Employ PEI\n\nEmploy PEI is a wage subsidy for eligible employers.',
				fetched_at: '2026-06-06T20:44:26.000Z'
			};
		}
	});

	assert.deepEqual(calls, ['crawl', 'exa']);
	assert.equal(result.success, true);
	assert.equal(result.reader, 'exa_contents');
	assert.equal(result.verification_source, 'exa_official_contents');
	assert.match(result.markdown ?? '', /wage subsidy/);
});

test('readOfficialSourceWithFallback rejects Exa contents challenge text', async () => {
	clearOfficialSourceReadCacheForTests();

	const result = await readOfficialSourceWithFallback({
		url: OFFICIAL_URL,
		exaApiKey: EXA_KEY,
		readWithCrawl4Ai: async () => ({
			success: false,
			url: OFFICIAL_URL,
			error: 'Blocked by anti-bot protection: Structural: no <body> tag (15145 bytes)',
			fetched_at: '2026-06-06T20:44:25.270528+00:00'
		}),
		readWithExaContents: async () => ({
			success: true,
			url: OFFICIAL_URL,
			markdown: 'Verifying your browser before proceeding...\nIncident ID: xyz',
			fetched_at: '2026-06-06T20:44:26.000Z'
		})
	});

	assert.equal(result.success, false);
	assert.equal(result.reader, 'blocked');
	assert.equal(result.error, 'blocked_by_anti_bot');
});

test('readOfficialSourceWithFallback caches blocked URLs briefly', async () => {
	clearOfficialSourceReadCacheForTests();
	let crawlCalls = 0;
	let exaCalls = 0;

	const input = {
		url: OFFICIAL_URL,
		exaApiKey: EXA_KEY,
		readWithCrawl4Ai: async () => {
			crawlCalls += 1;
			return {
				success: false,
				url: OFFICIAL_URL,
				error: 'Blocked by anti-bot protection: Structural: no <body> tag (15145 bytes)',
				fetched_at: '2026-06-06T20:44:25.270528+00:00'
			};
		},
		readWithExaContents: async () => {
			exaCalls += 1;
			return {
				success: false,
				url: OFFICIAL_URL,
				error: 'blocked_by_anti_bot',
				fetched_at: '2026-06-06T20:44:26.000Z'
			};
		}
	};

	const first = await readOfficialSourceWithFallback(input);
	const second = await readOfficialSourceWithFallback(input);

	assert.equal(first.success, false);
	assert.equal(second.success, false);
	assert.equal(crawlCalls, 1);
	assert.equal(exaCalls, 1);
});
