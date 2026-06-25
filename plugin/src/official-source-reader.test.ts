import assert from 'node:assert/strict';
import test from 'node:test';

import { FIRECRAWL_SCRAPE_RETRY_ATTEMPTS } from './constants.js';
import {
	clearOfficialSourceReadCacheForTests,
	detectBlockedSourceContent,
	logOfficialSourceReadDiagnostics,
	readOfficialSourceWithFallback,
	redactOfficialSourceResultForModel
} from './services/official-source-reader.js';
import { recoveryHintForBlockedUrl } from './services/official-source-recovery-hints.js';
import { resolveFirecrawlApiKey } from './services/penny-config.js';

const OFFICIAL_URL = 'https://www.princeedwardisland.ca/en/service/employ-pei';
const INVESTISSEMENT_QUEBEC_ESSOR_URL =
	'https://www.investquebec.com/fr/financement/programmes-gouvernementaux/essor/appui-la-concretisation-de-projets-dinvestissement';
const FIRECRAWL_KEY = 'firecrawl-test-key';
const TEST_FIRECRAWL_ENV_VAR = 'PENNY_TEST_FIRECRAWL_KEY';

test('detectBlockedSourceContent catches Radware challenge text', () => {
	assert.equal(
		detectBlockedSourceContent('Radware Page\nVerifying your browser before proceeding...\nIncident ID: abc'),
		true
	);
});

test('detectBlockedSourceContent ignores footer reCAPTCHA widget on long program pages', () => {
	const body =
		'# ESSOR\n\nAccélérez la concrétisation d’un projet d’investissement.\n\n'.repeat(120) +
		'\n\nCAPTCHA\n\nCharger le contenu externe fourni par Google reCAPTCHA';
	assert.equal(detectBlockedSourceContent(body), false);
});

test('detectBlockedSourceContent still blocks short captcha challenge pages', () => {
	assert.equal(
		detectBlockedSourceContent('Please complete the CAPTCHA\nVerifying your browser before proceeding'),
		true
	);
});

test('recoveryHintForBlockedUrl suggests Quebec cadre normatif for investquebec.com', () => {
	const hint = recoveryHintForBlockedUrl(INVESTISSEMENT_QUEBEC_ESSOR_URL);
	assert.match(hint ?? '', /cdn-contenu\.quebec\.ca|cadre normatif/i);
});

test('redactOfficialSourceResultForModel includes recovery_hint when blocked', () => {
	const publicResult = redactOfficialSourceResultForModel({
		success: false,
		url: INVESTISSEMENT_QUEBEC_ESSOR_URL,
		reader: 'blocked',
		verification_source: 'unverified_blocked',
		error: 'blocked_by_anti_bot',
		fetched_at: '2026-06-25T00:00:00.000Z'
	});

	assert.equal(publicResult.success, false);
	assert.match(publicResult.recovery_hint ?? '', /cadre normatif|cdn-contenu\.quebec\.ca/i);
	assert.doesNotMatch(JSON.stringify(publicResult), /blocked_by_anti_bot|EPIPE/i);
});

test('readOfficialSourceWithFallback accepts Investissement Quebec page with footer captcha chrome', async () => {
	clearOfficialSourceReadCacheForTests();
	const programBody =
		'# ESSOR\n\nAccélérez la concrétisation d’un projet d’investissement pour votre entreprise.\n\n'.repeat(
			120
		) + '\n\nCAPTCHA\n\nCharger le contenu externe fourni par Google reCAPTCHA';

	const { result } = await readOfficialSourceWithFallback({
		url: INVESTISSEMENT_QUEBEC_ESSOR_URL,
		firecrawlApiKey: FIRECRAWL_KEY,
		readWithCrawl4Ai: async () => ({
			success: false,
			url: INVESTISSEMENT_QUEBEC_ESSOR_URL,
			error: 'Blocked by anti-bot protection: HTTP 403',
			fetched_at: '2026-06-06T20:44:25.270528+00:00'
		}),
		readWithFirecrawlScrape: async () => ({
			success: true,
			url: INVESTISSEMENT_QUEBEC_ESSOR_URL,
			markdown: programBody,
			fetched_at: '2026-06-06T20:44:26.000Z'
		})
	});

	assert.equal(result.success, true);
	assert.equal(result.reader, 'firecrawl_scrape');
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

test('readOfficialSourceWithFallback uses Crawl4AI when local read is clean', async () => {
	clearOfficialSourceReadCacheForTests();
	const calls: string[] = [];

	const { result } = await readOfficialSourceWithFallback({
		url: OFFICIAL_URL,
		firecrawlApiKey: FIRECRAWL_KEY,
		readWithCrawl4Ai: async () => {
			calls.push('crawl');
			return {
				success: true,
				url: OFFICIAL_URL,
				markdown: '# Employ PEI\n\nEmploy PEI is a wage subsidy for eligible employers.',
				fetched_at: '2026-06-06T20:44:25.270528+00:00'
			};
		},
		readWithFirecrawlScrape: async () => {
			calls.push('firecrawl');
			throw new Error('firecrawl should not run');
		}
	});

	assert.deepEqual(calls, ['crawl']);
	assert.equal(result.success, true);
	assert.equal(result.reader, 'crawl4ai');
	assert.equal(result.verification_source, 'live_official_page');
});

test('readOfficialSourceWithFallback uses Firecrawl scrape when Crawl4AI is blocked', async () => {
	clearOfficialSourceReadCacheForTests();
	const calls: string[] = [];

	const { result } = await readOfficialSourceWithFallback({
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

test('readOfficialSourceWithFallback waits for Crawl4AI before Firecrawl', async () => {
	clearOfficialSourceReadCacheForTests();
	const calls: string[] = [];
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
		readWithCrawl4Ai: async () => {
			calls.push('crawl-start');
			return new Promise((resolve) => {
				resolveCrawl = resolve;
			});
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

	resolveCrawl?.({
		success: false,
		url: OFFICIAL_URL,
		error: 'crawl_late',
		fetched_at: '2026-06-06T20:44:27.000Z'
	});
	const { result } = await resultPromise;

	assert.deepEqual(calls, ['crawl-start', 'firecrawl']);
	assert.equal(result.success, true);
	assert.equal(result.reader, 'firecrawl_scrape');
});

test('readOfficialSourceWithFallback keeps clean Firecrawl scrape when Crawl4AI errors', async () => {
	clearOfficialSourceReadCacheForTests();

	const { result } = await readOfficialSourceWithFallback({
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
	let firecrawlCalls = 0;

	const { result } = await readOfficialSourceWithFallback({
		url: OFFICIAL_URL,
		firecrawlApiKey: FIRECRAWL_KEY,
		readWithCrawl4Ai: async () => ({
			success: false,
			url: OFFICIAL_URL,
			error: 'Blocked by anti-bot protection: Structural: no <body> tag (15145 bytes)',
			fetched_at: '2026-06-06T20:44:25.270528+00:00'
		}),
		readWithFirecrawlScrape: async () => {
			firecrawlCalls += 1;
			return {
				success: true,
				url: OFFICIAL_URL,
				markdown: 'Verifying your browser before proceeding...\nIncident ID: xyz',
				fetched_at: '2026-06-06T20:44:26.000Z'
			};
		}
	});

	assert.equal(result.success, false);
	assert.equal(result.reader, 'blocked');
	assert.equal(result.error, 'blocked_by_anti_bot');
	assert.equal(firecrawlCalls, FIRECRAWL_SCRAPE_RETRY_ATTEMPTS);
});

test('readOfficialSourceWithFallback skips Firecrawl when API key is missing', async () => {
	clearOfficialSourceReadCacheForTests();
	let firecrawlCalls = 0;

	const { result } = await readOfficialSourceWithFallback({
		url: OFFICIAL_URL,
		readWithCrawl4Ai: async () => ({
			success: false,
			url: OFFICIAL_URL,
			error: 'Blocked by anti-bot protection: HTTP 403',
			fetched_at: '2026-06-06T20:44:25.270528+00:00'
		}),
		readWithFirecrawlScrape: async () => {
			firecrawlCalls += 1;
			throw new Error('firecrawl should not run');
		}
	});

	assert.equal(result.success, false);
	assert.equal(result.reader, 'blocked');
	assert.equal(firecrawlCalls, 0);
});

test('readOfficialSourceWithFallback exposes diagnostics for Firecrawl fallback', async () => {
	clearOfficialSourceReadCacheForTests();

	const { result, diagnostics } = await readOfficialSourceWithFallback({
		url: OFFICIAL_URL,
		firecrawlApiKey: FIRECRAWL_KEY,
		readWithCrawl4Ai: async () => ({
			success: false,
			url: OFFICIAL_URL,
			error: 'Blocked by anti-bot protection: HTTP 403',
			fetched_at: '2026-06-06T20:44:25.270528+00:00'
		}),
		readWithFirecrawlScrape: async () => ({
			success: true,
			url: OFFICIAL_URL,
			markdown: '# Employ PEI\n\nEmploy PEI is a wage subsidy for eligible employers.',
			fetched_at: '2026-06-06T20:44:26.000Z'
		})
	});

	assert.equal(result.reader, 'firecrawl_scrape');
	assert.equal(diagnostics.crawlSuccess, false);
	assert.equal(diagnostics.crawlClean, false);
	assert.match(diagnostics.crawlError ?? '', /403/);
	assert.equal(diagnostics.firecrawlSkipped, false);
	assert.equal(diagnostics.firecrawlAttempts, 1);
	assert.deepEqual(diagnostics.firecrawlErrors, ['clean']);
	assert.equal(diagnostics.outcome, 'firecrawl_scrape');
});

test('logOfficialSourceReadDiagnostics skips clean Crawl4AI reads', () => {
	const warnings: string[] = [];
	const prior = console.warn;
	console.warn = (message?: unknown) => {
		warnings.push(String(message));
	};

	try {
		logOfficialSourceReadDiagnostics({
			url: OFFICIAL_URL,
			cacheHit: false,
			crawlSuccess: true,
			crawlClean: true,
			firecrawlSkipped: true,
			firecrawlAttempts: 0,
			firecrawlErrors: [],
			outcome: 'crawl4ai'
		});
	} finally {
		console.warn = prior;
	}

	assert.deepEqual(warnings, []);
});

test('logOfficialSourceReadDiagnostics logs blocked reads', () => {
	const warnings: string[] = [];
	const prior = console.warn;
	console.warn = (message?: unknown) => {
		warnings.push(String(message));
	};

	try {
		logOfficialSourceReadDiagnostics({
			url: OFFICIAL_URL,
			cacheHit: false,
			crawlSuccess: false,
			crawlClean: false,
			crawlError: 'HTTP 403',
			firecrawlSkipped: false,
			firecrawlAttempts: 3,
			firecrawlErrors: ['blocked_content', 'blocked_content', 'blocked_content'],
			outcome: 'blocked'
		});
	} finally {
		console.warn = prior;
	}

	assert.equal(warnings.length, 1);
	assert.match(warnings[0] ?? '', /read_official_source/);
	assert.match(warnings[0] ?? '', /"outcome":"blocked"/);
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

test('readOfficialSourceWithFallback caches successful reads but not blocked URLs', async () => {
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

	const first = (await readOfficialSourceWithFallback(input)).result;
	const second = (await readOfficialSourceWithFallback(input)).result;

	assert.equal(first.success, false);
	assert.equal(second.success, false);
	assert.equal(crawlCalls, 2);
	assert.equal(firecrawlCalls, FIRECRAWL_SCRAPE_RETRY_ATTEMPTS * 2);
});
