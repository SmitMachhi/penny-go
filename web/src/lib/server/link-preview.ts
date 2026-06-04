import { lookup } from 'node:dns/promises';

import type { LinkPreview } from '$lib/link-preview/types.js';
import { ValidationError } from '$lib/server/api-error.js';
import { parseLinkPreviewFromHtml } from '$lib/server/link-preview-parse.js';
import { isBlockedPreviewHostname, parsePreviewableUrl } from '$lib/server/link-preview-url.js';

const FETCH_TIMEOUT_MS = 8_000;
const MAX_HTML_BYTES = 512_000;
const CACHE_TTL_MS = 3_600_000;
const MAX_REDIRECTS = 5;
const USER_AGENT = 'PennyLinkPreview/1.0';
const MOVED_PERMANENTLY_STATUS = 301;
const FOUND_STATUS = 302;
const SEE_OTHER_STATUS = 303;
const TEMPORARY_REDIRECT_STATUS = 307;
const PERMANENT_REDIRECT_STATUS = 308;
const REDIRECT_STATUSES = new Set([
	MOVED_PERMANENTLY_STATUS,
	FOUND_STATUS,
	SEE_OTHER_STATUS,
	TEMPORARY_REDIRECT_STATUS,
	PERMANENT_REDIRECT_STATUS
]);

type CacheEntry = {
	preview: LinkPreview;
	expiresAt: number;
};

type DownloadedHtml = {
	html: string;
	url: URL;
};

const previewCache = new Map<string, CacheEntry>();

export async function fetchLinkPreview(rawUrl: string): Promise<LinkPreview> {
	const url = parsePreviewableUrl(rawUrl);
	const cacheKey = url.toString();
	const cached = previewCache.get(cacheKey);
	if (cached && cached.expiresAt > Date.now()) {
		return cached.preview;
	}

	const downloaded = await downloadHtml(url);
	const preview = parseLinkPreviewFromHtml(downloaded.html, downloaded.url);
	previewCache.set(cacheKey, { preview, expiresAt: Date.now() + CACHE_TTL_MS });
	return preview;
}

async function downloadHtml(initialUrl: URL): Promise<DownloadedHtml> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	let url = initialUrl;

	try {
		for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
			const response = await fetchPreviewUrl(url, controller.signal);
			if (isRedirectResponse(response)) {
				url = parseRedirectUrl(response, url, redirectCount);
				continue;
			}

			if (!response.ok) {
				throw new Error(`preview fetch failed: ${response.status}`);
			}

			const contentType = response.headers.get('content-type') ?? '';
			if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
				throw new Error('preview response is not html');
			}

			const buffer = await readLimitedBody(response, MAX_HTML_BYTES);
			return {
				html: new TextDecoder('utf-8', { fatal: false }).decode(buffer),
				url
			};
		}

		throw new Error('preview redirect limit exceeded');
	} finally {
		clearTimeout(timeout);
	}
}

async function fetchPreviewUrl(url: URL, signal: AbortSignal): Promise<Response> {
	await assertPublicResolvedAddresses(url);
	return fetch(url, {
		signal,
		headers: {
			Accept: 'text/html,application/xhtml+xml',
			'User-Agent': USER_AGENT
		},
		redirect: 'manual'
	});
}

async function assertPublicResolvedAddresses(url: URL): Promise<void> {
	const addresses = await lookup(url.hostname, { all: true, verbatim: true });
	if (addresses.length === 0) {
		throw new ValidationError('url host is not allowed');
	}
	if (addresses.some((entry) => isBlockedPreviewHostname(entry.address.toLowerCase()))) {
		throw new ValidationError('url host is not allowed');
	}
}

function isRedirectResponse(response: Response): boolean {
	return REDIRECT_STATUSES.has(response.status);
}

function parseRedirectUrl(response: Response, currentUrl: URL, redirectCount: number): URL {
	if (redirectCount >= MAX_REDIRECTS) {
		throw new Error('preview redirect limit exceeded');
	}

	const location = response.headers.get('location')?.trim();
	if (!location) {
		throw new Error('preview redirect missing location');
	}

	try {
		return parsePreviewableUrl(new URL(location, currentUrl).toString());
	} catch (error) {
		if (error instanceof ValidationError) {
			throw error;
		}
		throw new ValidationError('redirect url is invalid');
	}
}

async function readLimitedBody(response: Response, maxBytes: number): Promise<Uint8Array> {
	const reader = response.body?.getReader();
	if (!reader) {
		const fallback = await response.arrayBuffer();
		return new Uint8Array(fallback.slice(0, maxBytes));
	}

	const chunks: Uint8Array[] = [];
	let total = 0;

	while (total < maxBytes) {
		const { done, value } = await reader.read();
		if (done || !value) {
			break;
		}

		const remaining = maxBytes - total;
		const slice = value.byteLength > remaining ? value.slice(0, remaining) : value;
		chunks.push(slice);
		total += slice.byteLength;
	}

	await reader.cancel();

	const merged = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		merged.set(chunk, offset);
		offset += chunk.byteLength;
	}

	return merged;
}

export function clearLinkPreviewCacheForTests(): void {
	previewCache.clear();
}
