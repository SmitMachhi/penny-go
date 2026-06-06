import {
	OFFICIAL_SOURCE_BLOCKED_CACHE_TTL_MS,
	OFFICIAL_SOURCE_SUCCESS_CACHE_TTL_MS
} from '../constants.js';
import type { PennyToolsConfigShape } from './penny-config.js';

const WWW_PREFIX_PATTERN = /^www\./i;
const RADWARE_PATTERN = /\bradware page\b/i;
const VERIFY_BROWSER_PATTERN = /verifying your browser before proceeding/i;
const INCIDENT_ID_PATTERN = /\bincident id\s*:/i;
const CAPTCHA_PATTERN = /\bcaptcha\b/i;
const ACCESS_DENIED_PATTERN = /\baccess denied\b/i;
const STRUCTURAL_BODY_ERROR_PATTERN = /no <body> tag/i;
const EMPTY_CONTENT_PATTERN = /^\s*$/;

type RawSourceReadResult = Record<string, unknown> & {
	success?: unknown;
	url?: unknown;
	markdown?: unknown;
	error?: unknown;
	fetched_at?: unknown;
};

export type OfficialSourceReader = 'crawl4ai' | 'exa_contents' | 'blocked';
export type VerificationSource =
	| 'live_official_page'
	| 'exa_official_contents'
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

export type OfficialSourceReaderDeps = {
	readWithCrawl4Ai: (input: {
		url: string;
		timeoutMs: number;
		signal?: AbortSignal | undefined;
	}) => Promise<RawSourceReadResult>;
	readWithExaContents: (input: {
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
		CAPTCHA_PATTERN.test(text) ||
		ACCESS_DENIED_PATTERN.test(text) ||
		STRUCTURAL_BODY_ERROR_PATTERN.test(text)
	);
}

export function clearOfficialSourceReadCacheForTests(): void {
	sourceReadCache.clear();
}

export async function readOfficialSourceWithFallback(input: {
	url: string;
	config?: PennyToolsConfigShape | undefined;
	exaApiKey?: string | undefined;
	htmlTimeoutMs?: number | undefined;
	pdfTimeoutMs?: number | undefined;
	signal?: AbortSignal | undefined;
	readWithCrawl4Ai: OfficialSourceReaderDeps['readWithCrawl4Ai'];
	readWithExaContents: OfficialSourceReaderDeps['readWithExaContents'];
}): Promise<OfficialSourceReadResult> {
	const normalizedUrl = normalizeOfficialUrl(input.url);
	const cached = readCachedResult(normalizedUrl);
	if (cached) {
		return cached;
	}

	const crawl = await input.readWithCrawl4Ai({
		url: normalizedUrl,
		timeoutMs: resolveTimeoutMs(normalizedUrl, input),
		signal: input.signal
	});
	const crawlResult = normalizeReaderPayload(crawl, normalizedUrl, 'crawl4ai');
	if (isCleanSuccessfulRead(crawlResult, normalizedUrl)) {
		return cacheAndReturn(normalizedUrl, crawlResult, OFFICIAL_SOURCE_SUCCESS_CACHE_TTL_MS);
	}

	const exa = await input.readWithExaContents({
		url: normalizedUrl,
		apiKey: input.exaApiKey,
		signal: input.signal
	});
	const exaResult = normalizeReaderPayload(exa, normalizedUrl, 'exa_contents');
	if (isCleanSuccessfulRead(exaResult, normalizedUrl)) {
		return cacheAndReturn(normalizedUrl, exaResult, OFFICIAL_SOURCE_SUCCESS_CACHE_TTL_MS);
	}

	return cacheAndReturn(
		normalizedUrl,
		blockedResult(normalizedUrl, exaResult.fetched_at ?? crawlResult.fetched_at),
		OFFICIAL_SOURCE_BLOCKED_CACHE_TTL_MS
	);
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
		reader === 'crawl4ai' ? 'live_official_page' : 'exa_official_contents';

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
