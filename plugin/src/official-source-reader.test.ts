import assert from 'node:assert/strict';
import test from 'node:test';

import {
	clearOfficialSourceReadCacheForTests,
	detectBlockedSourceContent,
	readOfficialSourceWithFallback,
	redactOfficialSourceResultForModel
} from './services/official-source-reader.js';
import { resolveFirecrawlApiKey } from './services/penny-config.js';

const OFFICIAL_URL = 'https://www.princeedwardisland.ca/en/service/employ-pei';
const FIRECRAWL_KEY = 'firecrawl-test-key';
const TEST_FIRECRAWL_ENV_VAR = 'PENNY_TEST_FIRECRAWL_KEY';
const FAST_FALLBACK_WAIT_MS = 20;

function wait(ms: number): Promise<'waiting'> {
	return new Promise((resolve) => {
		setTimeout(() => resolve('waiting'), ms);
	});
}

test('detectBlockedSourceContent catches Radware challenge text', () => {
	assert.equal(
		detectBlockedSourceContent('Radware Page\nVerifying your browser before proceeding...\nIncident ID: abc'),
		true
	);
});

test('resolveFirecrawlApiKey reads env-backed config markers', () => {
	const prior = process.env[TEST_FIRECRAWL_ENV_VAR];
	process.env[TEST_FIRECRAWL_ENV_VAR] = FIRECRAWL_KEY;
	try {
		assert.equal(
			resolveFirecrawlApiKey({ firecrawlApiKey: `env:${TEST_FIRECRAWL_ENV_VAR}` }),
			FIRECRAWL_KEY
		);
	} finally {
		if (prior === undefined) {
			delete process.env[TEST_FIRECRAWL_ENV_VAR];
		} else {
			process.env[TEST_FIRECRAWL_ENV_VAR] = prior;
		}
	}
});

test('readOfficialSourceWithFallback uses Firecrawl scrape when Crawl4AI is blocked', async () => {
	clearOfficialSourceReadCacheForTests();
	const calls: string[] = [];

	const result = await readOfficialSourceWithFallback({
		url: OFFICIAL_URL,
		firecrawlApiKey: FIRECRAWL_KEY,
		readWithCrawl4Ai: async () => {
			calls.push('crawl');
			return {
				success: true,
				url: OFFICIAL_URL,
				markdown: 'Radware Page\nVerifying your browser before proceeding...\nIncident ID: abc',
				fetched_at: '2026-06-06T20:44:25.270528+00:00'
			};
		},
		readWithFirecrawlScrape: async () => {
			calls.push('firecrawl');
			return {
				success: true,
				url: OFFICIAL_URL,
				markdown: '# Employ PEI\n\nEmploy PEI is a wage subsidy for eligible employers.',
				fetched_at: '2026-06-06T20:44:26.000Z'
			};
		}
	});

	assert.deepEqual(calls, ['crawl', 'firecrawl']);
	assert.equal(result.success, true);
	assert.equal(result.reader, 'firecrawl_scrape');
	assert.equal(result.verification_source, 'firecrawl_official_scrape');
	assert.match(result.markdown ?? '', /wage subsidy/);
});

test('readOfficialSourceWithFallback returns clean Firecrawl scrape without waiting for slow Crawl4AI', async () => {
	clearOfficialSourceReadCacheForTests();
	let resolveCrawl:
		| ((value: {
				success: boolean;
				url: string;
				error: string;
				fetched_at: string;
		  }) => void)
		| undefined;

	const resultPromise = readOfficialSourceWithFallback({
		url: OFFICIAL_URL,
		firecrawlApiKey: FIRECRAWL_KEY,
		readWithCrawl4Ai: async () =>
			new Promise((resolve) => {
				resolveCrawl = resolve;
			}),
		readWithFirecrawlScrape: async () => ({
			success: true,
			url: OFFICIAL_URL,
			markdown: '# Employ PEI\n\nEmploy PEI is a wage subsidy for eligible employers.',
			fetched_at: '2026-06-06T20:44:26.000Z'
		})
	});

	const early = await Promise.race([resultPromise, wait(FAST_FALLBACK_WAIT_MS)]);
	resolveCrawl?.({
		success: false,
		url: OFFICIAL_URL,
		error: 'crawl_late',
		fetched_at: '2026-06-06T20:44:27.000Z'
	});
	const result = await resultPromise;

	assert.notEqual(early, 'waiting');
	assert.equal(result.success, true);
	assert.equal(result.reader, 'firecrawl_scrape');
});

test('readOfficialSourceWithFallback keeps clean Firecrawl scrape when Crawl4AI errors', async () => {
	clearOfficialSourceReadCacheForTests();

	const result = await readOfficialSourceWithFallback({
		url: OFFICIAL_URL,
		firecrawlApiKey: FIRECRAWL_KEY,
		readWithCrawl4Ai: async () => {
			throw new Error('crawl failed');
		},
		readWithFirecrawlScrape: async () => ({
			success: true,
			url: OFFICIAL_URL,
			markdown: '# Employ PEI\n\nEmploy PEI is a wage subsidy for eligible employers.',
			fetched_at: '2026-06-06T20:44:26.000Z'
		})
	});

	assert.equal(result.success, true);
	assert.equal(result.reader, 'firecrawl_scrape');
});

test('readOfficialSourceWithFallback rejects Firecrawl challenge text', async () => {
	clearOfficialSourceReadCacheForTests();

	const result = await readOfficialSourceWithFallback({
		url: OFFICIAL_URL,
		firecrawlApiKey: FIRECRAWL_KEY,
		readWithCrawl4Ai: async () => ({
			success: false,
			url: OFFICIAL_URL,
			error: 'Blocked by anti-bot protection: Structural: no <body> tag (15145 bytes)',
			fetched_at: '2026-06-06T20:44:25.270528+00:00'
		}),
		readWithFirecrawlScrape: async () => ({
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

test('redactOfficialSourceResultForModel hides blocked source text', () => {
	const publicResult = redactOfficialSourceResultForModel({
		success: false,
		url: OFFICIAL_URL,
		reader: 'blocked',
		verification_source: 'unverified_blocked',
		error: 'blocked_by_anti_bot',
		fetched_at: '2026-06-06T20:44:26.000Z'
	});

	assert.equal(publicResult.success, false);
	assert.equal(publicResult.summary, 'Could not verify this page.');
	assert.doesNotMatch(JSON.stringify(publicResult), /blocked_by_anti_bot|anti-bot protection/i);
});

test('redactOfficialSourceResultForModel preserves successful Firecrawl content', () => {
	const publicResult = redactOfficialSourceResultForModel({
		success: true,
		url: OFFICIAL_URL,
		reader: 'firecrawl_scrape',
		verification_source: 'firecrawl_official_scrape',
		markdown: '# Employ PEI\n\nEmploy PEI is a wage subsidy for eligible employers.',
		fetched_at: '2026-06-06T20:44:26.000Z'
	});

	assert.equal(publicResult.success, true);
	assert.equal(publicResult.summary, 'Retrieved official page content via Firecrawl.');
	assert.match(publicResult.markdown ?? '', /wage subsidy/);
	assert.equal(publicResult.benefit_scope?.scope_verdict, 'unknown');
});

test('readOfficialSourceWithFallback caches blocked URLs briefly', async () => {
	clearOfficialSourceReadCacheForTests();
	let crawlCalls = 0;
	let firecrawlCalls = 0;

	const input = {
		url: OFFICIAL_URL,
		firecrawlApiKey: FIRECRAWL_KEY,
		readWithCrawl4Ai: async () => {
			crawlCalls += 1;
			return {
				success: false,
				url: OFFICIAL_URL,
				error: 'Blocked by anti-bot protection: Structural: no <body> tag (15145 bytes)',
				fetched_at: '2026-06-06T20:44:25.270528+00:00'
			};
		},
		readWithFirecrawlScrape: async () => {
			firecrawlCalls += 1;
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
	assert.equal(firecrawlCalls, 1);
});
