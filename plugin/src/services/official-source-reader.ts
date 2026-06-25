import {
	FIRECRAWL_SCRAPE_RETRY_ATTEMPTS,
	FIRECRAWL_SCRAPE_RETRY_DELAY_MS,
	OFFICIAL_SOURCE_SUBSTANTIVE_PAGE_MIN_CHARS,
	OFFICIAL_SOURCE_SUCCESS_CACHE_TTL_MS
} from '../constants.js';
import {
	officialBenefitScopeFromMarkdown,
	type OfficialBenefitScope
} from '../domain/official-benefit-scope.js';
import { recoveryHintForBlockedUrl } from './official-source-recovery-hints.js';
import type { PennyToolsConfigShape } from './penny-config.js';

const WWW_PREFIX_PATTERN = /^www\./i;
const RADWARE_PATTERN = /\bradware page\b/i;
const VERIFY_BROWSER_PATTERN = /verifying your browser before proceeding/i;
const INCIDENT_ID_PATTERN = /\bincident id\s*:/i;
const CAPTCHA_PATTERN = /\bcaptcha\b/i;
const ACCESS_DENIED_PATTERN = /\baccess denied\b/i;
const STRUCTURAL_BODY_ERROR_PATTERN = /no <body> tag/i;
const EMPTY_CONTENT_PATTERN = /^\s*$/;
const FIRST_RETRY_ATTEMPT = 1;

type RawSourceReadResult = Record<string, unknown> & {
	success?: unknown;
	url?: unknown;
	markdown?: unknown;
	error?: unknown;
	fetched_at?: unknown;
};

export type OfficialSourceReader = 'crawl4ai' | 'firecrawl_scrape' | 'blocked';
export type VerificationSource =
	| 'live_official_page'
	| 'firecrawl_official_scrape'
	| 'unverified_blocked';

export type OfficialSourceReadResult = Record<string, unknown> & {
	success: boolean;
	url: string;
	reader: OfficialSourceReader;
	verification_source: VerificationSource;
	markdown?: string | undefined;
	error?: string | undefined;
	fetched_at?: string | undefined;
};

export type OfficialSourceModelResult = {
	success: boolean;
	url: string;
	reader: OfficialSourceReader;
	verification_source: VerificationSource;
	summary: string;
	markdown?: string | undefined;
	fetched_at?: string | undefined;
	benefit_scope?: OfficialBenefitScope | undefined;
	recovery_hint?: string | undefined;
};

export type OfficialSourceReadDiagnostics = {
	url: string;
	cacheHit: boolean;
	crawlSuccess: boolean;
	crawlClean: boolean;
	crawlError?: string | undefined;
	firecrawlSkipped: boolean;
	firecrawlAttempts: number;
	firecrawlErrors: string[];
	outcome: OfficialSourceReader;
};

export type OfficialSourceReadOutcome = {
	result: OfficialSourceReadResult;
	diagnostics: OfficialSourceReadDiagnostics;
};

export type OfficialSourceReaderDeps = {
	readWithCrawl4Ai: (input: {
		url: string;
		timeoutMs: number;
		signal?: AbortSignal | undefined;
	}) => Promise<RawSourceReadResult>;
	readWithFirecrawlScrape: (input: {
		url: string;
		apiKey: string | undefined;
		signal?: AbortSignal | undefined;
	}) => Promise<RawSourceReadResult>;
};

type CacheEntry = {
	expiresAt: number;
	result: OfficialSourceReadResult;
};

const sourceReadCache = new Map<string, CacheEntry>();

export function detectBlockedSourceContent(text: string): boolean {
	return (
		RADWARE_PATTERN.test(text) ||
		VERIFY_BROWSER_PATTERN.test(text) ||
		INCIDENT_ID_PATTERN.test(text) ||
		captchaIndicatesBlock(text) ||
		ACCESS_DENIED_PATTERN.test(text) ||
		STRUCTURAL_BODY_ERROR_PATTERN.test(text)
	);
}

function captchaIndicatesBlock(text: string): boolean {
	if (!CAPTCHA_PATTERN.test(text)) {
		return false;
	}
	if (text.length >= OFFICIAL_SOURCE_SUBSTANTIVE_PAGE_MIN_CHARS) {
		return false;
	}
	return (
		VERIFY_BROWSER_PATTERN.test(text) ||
		RADWARE_PATTERN.test(text) ||
		INCIDENT_ID_PATTERN.test(text)
	);
}

export function clearOfficialSourceReadCacheForTests(): void {
	sourceReadCache.clear();
}

export function redactOfficialSourceResultForModel(
	result: OfficialSourceReadResult
): OfficialSourceModelResult {
	if (!result.success || result.reader === 'blocked' || !result.markdown) {
		const blocked = result.reader === 'blocked';
		return {
			success: false,
			url: result.url,
			reader: result.reader,
			verification_source: result.verification_source,
			summary: 'Could not verify this page.',
			fetched_at: result.fetched_at,
			recovery_hint: blocked ? recoveryHintForBlockedUrl(result.url) : undefined
		};
	}

	return {
		success: true,
		url: result.url,
		reader: result.reader,
		verification_source: result.verification_source,
		summary:
			result.verification_source === 'firecrawl_official_scrape'
				? 'Retrieved official page content via Firecrawl.'
				: 'Retrieved official page content.',
		markdown: result.markdown,
		fetched_at: result.fetched_at,
		benefit_scope: officialBenefitScopeFromMarkdown(result.markdown)
	};
}

export function logOfficialSourceReadDiagnostics(diagnostics: OfficialSourceReadDiagnostics): void {
	if (diagnostics.cacheHit || diagnostics.outcome === 'crawl4ai') {
		return;
	}

	console.warn(`[penny-tools] read_official_source ${JSON.stringify(diagnostics)}`);
}

export async function readOfficialSourceWithFallback(input: {
	url: string;
	config?: PennyToolsConfigShape | undefined;
	firecrawlApiKey?: string | undefined;
	htmlTimeoutMs?: number | undefined;
	pdfTimeoutMs?: number | undefined;
	signal?: AbortSignal | undefined;
	readWithCrawl4Ai: OfficialSourceReaderDeps['readWithCrawl4Ai'];
	readWithFirecrawlScrape: OfficialSourceReaderDeps['readWithFirecrawlScrape'];
}): Promise<OfficialSourceReadOutcome> {
	const normalizedUrl = normalizeOfficialUrl(input.url);
	const cached = readCachedResult(normalizedUrl);
	if (cached) {
		return {
			result: cached,
			diagnostics: {
				url: normalizedUrl,
				cacheHit: true,
				crawlSuccess: cached.reader === 'crawl4ai',
				crawlClean: cached.reader === 'crawl4ai',
				firecrawlSkipped: true,
				firecrawlAttempts: 0,
				firecrawlErrors: [],
				outcome: cached.reader
			}
		};
	}

	const crawlResult = await readSafely(
		input.readWithCrawl4Ai({
			url: normalizedUrl,
			timeoutMs: resolveTimeoutMs(normalizedUrl, input),
			signal: input.signal
		}),
		normalizedUrl,
		'crawl4ai'
	);
	const crawlClean = isCleanSuccessfulRead(crawlResult, normalizedUrl);

	if (crawlClean) {
		return {
			result: cacheAndReturn(normalizedUrl, crawlResult, OFFICIAL_SOURCE_SUCCESS_CACHE_TTL_MS),
			diagnostics: buildDiagnostics({
				url: normalizedUrl,
				crawlResult,
				crawlClean: true,
				firecrawlSkipped: true,
				firecrawlAttempts: 0,
				firecrawlErrors: [],
				outcome: 'crawl4ai'
			})
		};
	}

	const firecrawlSkipped = !input.firecrawlApiKey?.trim();
	const firecrawlAttempt = firecrawlSkipped
		? { result: null, attempts: 0, errors: [] as string[] }
		: await readFirecrawlWithRetries(input, normalizedUrl);
	const firecrawlResult = firecrawlAttempt.result;
	const firecrawlClean =
		firecrawlResult !== null && isCleanSuccessfulRead(firecrawlResult, normalizedUrl);

	if (firecrawlClean && firecrawlResult) {
		return {
			result: cacheAndReturn(normalizedUrl, firecrawlResult, OFFICIAL_SOURCE_SUCCESS_CACHE_TTL_MS),
			diagnostics: buildDiagnostics({
				url: normalizedUrl,
				crawlResult,
				crawlClean: false,
				firecrawlSkipped,
				firecrawlAttempts: firecrawlAttempt.attempts,
				firecrawlErrors: firecrawlAttempt.errors,
				outcome: 'firecrawl_scrape'
			})
		};
	}

	return {
		result: blockedResult(
			normalizedUrl,
			firecrawlResult?.fetched_at ?? crawlResult.fetched_at
		),
		diagnostics: buildDiagnostics({
			url: normalizedUrl,
			crawlResult,
			crawlClean: false,
			firecrawlSkipped,
			firecrawlAttempts: firecrawlAttempt.attempts,
			firecrawlErrors: firecrawlAttempt.errors,
			outcome: 'blocked'
		})
	};
}

export function normalizeOfficialUrl(url: string): string {
	const parsed = new URL(url);
	parsed.hash = '';
	return parsed.toString();
}

function resolveTimeoutMs(
	url: string,
	input: {
		htmlTimeoutMs?: number | undefined;
		pdfTimeoutMs?: number | undefined;
	}
): number {
	return isPdfUrl(url) ? (input.pdfTimeoutMs ?? 0) : (input.htmlTimeoutMs ?? 0);
}

function isPdfUrl(url: string): boolean {
	return new URL(url).pathname.toLowerCase().endsWith('.pdf');
}

function normalizeReaderPayload(
	payload: RawSourceReadResult,
	requestedUrl: string,
	reader: Exclude<OfficialSourceReader, 'blocked'>
): OfficialSourceReadResult {
	const url = readString(payload.url) ?? requestedUrl;
	const markdown = readString(payload.markdown);
	const error = readString(payload.error);
	const success = payload.success === true;
	const verification_source =
		reader === 'crawl4ai' ? 'live_official_page' : 'firecrawl_official_scrape';

	return {
		...payload,
		success,
		url,
		reader,
		verification_source,
		markdown,
		error,
		fetched_at: readString(payload.fetched_at)
	};
}

async function readSafely(
	promise: Promise<RawSourceReadResult>,
	requestedUrl: string,
	reader: Exclude<OfficialSourceReader, 'blocked'>
): Promise<OfficialSourceReadResult> {
	try {
		const payload = await promise;
		return normalizeReaderPayload(payload, requestedUrl, reader);
	} catch (error) {
		return normalizeReaderPayload(
			{
				success: false,
				url: requestedUrl,
				error: error instanceof Error ? error.message : 'source_reader_failed',
				fetched_at: new Date().toISOString()
			},
			requestedUrl,
			reader
		);
	}
}

type FirecrawlRetryOutcome = {
	result: OfficialSourceReadResult | null;
	attempts: number;
	errors: string[];
};

async function readFirecrawlWithRetries(
	input: {
		firecrawlApiKey?: string | undefined;
		signal?: AbortSignal | undefined;
		readWithFirecrawlScrape: OfficialSourceReaderDeps['readWithFirecrawlScrape'];
	},
	normalizedUrl: string
): Promise<FirecrawlRetryOutcome> {
	const errors: string[] = [];
	let lastResult: OfficialSourceReadResult | null = null;

	for (let attempt = FIRST_RETRY_ATTEMPT; attempt <= FIRECRAWL_SCRAPE_RETRY_ATTEMPTS; attempt += 1) {
		if (attempt > FIRST_RETRY_ATTEMPT) {
			await pause(FIRECRAWL_SCRAPE_RETRY_DELAY_MS);
		}

		const result = await readSafely(
			input.readWithFirecrawlScrape({
				url: normalizedUrl,
				apiKey: input.firecrawlApiKey,
				signal: input.signal
			}),
			normalizedUrl,
			'firecrawl_scrape'
		);
		lastResult = result;
		errors.push(describeFirecrawlAttempt(result, normalizedUrl));
		if (isCleanSuccessfulRead(result, normalizedUrl)) {
			return { result, attempts: attempt, errors };
		}
	}

	return { result: lastResult, attempts: FIRECRAWL_SCRAPE_RETRY_ATTEMPTS, errors };
}

function buildDiagnostics(input: {
	url: string;
	crawlResult: OfficialSourceReadResult;
	crawlClean: boolean;
	firecrawlSkipped: boolean;
	firecrawlAttempts: number;
	firecrawlErrors: string[];
	outcome: OfficialSourceReader;
}): OfficialSourceReadDiagnostics {
	return {
		url: input.url,
		cacheHit: false,
		crawlSuccess: input.crawlResult.success === true,
		crawlClean: input.crawlClean,
		crawlError: input.crawlResult.error,
		firecrawlSkipped: input.firecrawlSkipped,
		firecrawlAttempts: input.firecrawlAttempts,
		firecrawlErrors: input.firecrawlErrors,
		outcome: input.outcome
	};
}

function describeFirecrawlAttempt(
	result: OfficialSourceReadResult,
	requestedUrl: string
): string {
	if (isCleanSuccessfulRead(result, requestedUrl)) {
		return 'clean';
	}
	if (result.error) {
		return result.error;
	}
	if (result.markdown && detectBlockedSourceContent(result.markdown)) {
		return 'blocked_content';
	}
	if (!result.success) {
		return 'request_failed';
	}
	return 'not_clean';
}

function pause(delayMs: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, delayMs);
	});
}

function isCleanSuccessfulRead(result: OfficialSourceReadResult, requestedUrl: string): boolean {
	if (result.success !== true || !result.markdown) {
		return false;
	}
	if (!isSameOfficialUrl(requestedUrl, result.url)) {
		return false;
	}
	if (!isMeaningfulSourceContent(result.markdown)) {
		return false;
	}
	return !detectBlockedSourceContent(result.markdown);
}

function isMeaningfulSourceContent(text: string): boolean {
	return !EMPTY_CONTENT_PATTERN.test(text);
}

function isSameOfficialUrl(requestedUrl: string, returnedUrl: string): boolean {
	try {
		const requested = new URL(requestedUrl);
		const returned = new URL(returnedUrl);
		return normalizeHostname(requested.hostname) === normalizeHostname(returned.hostname);
	} catch {
		return false;
	}
}

function normalizeHostname(hostname: string): string {
	return hostname.toLowerCase().replace(WWW_PREFIX_PATTERN, '');
}

function blockedResult(url: string, fetchedAt: string | undefined): OfficialSourceReadResult {
	return {
		success: false,
		url,
		reader: 'blocked',
		verification_source: 'unverified_blocked',
		error: 'blocked_by_anti_bot',
		fetched_at: fetchedAt
	};
}

function readCachedResult(url: string): OfficialSourceReadResult | null {
	const entry = sourceReadCache.get(url);
	if (!entry) {
		return null;
	}
	if (entry.expiresAt <= Date.now()) {
		sourceReadCache.delete(url);
		return null;
	}
	return entry.result;
}

function cacheAndReturn(
	url: string,
	result: OfficialSourceReadResult,
	ttlMs: number
): OfficialSourceReadResult {
	sourceReadCache.set(url, { result, expiresAt: Date.now() + ttlMs });
	return result;
}

function readString(value: unknown): string | undefined {
	if (typeof value !== 'string') {
		return undefined;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}
