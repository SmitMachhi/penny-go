import { lookup } from 'node:dns/promises';
import { request as httpRequest } from 'node:http';
import type {
	IncomingHttpHeaders,
	IncomingMessage,
	RequestOptions as HttpRequestOptions
} from 'node:http';
import { request as httpsRequest } from 'node:https';
import type { RequestOptions as HttpsRequestOptions } from 'node:https';

import type { LinkPreview } from '$lib/link-preview/types.js';
import { ValidationError } from '$lib/server/api-error.js';
import { parseLinkPreviewFromHtml } from '$lib/server/link-preview-parse.js';
import { isBlockedPreviewHostname, parsePreviewableUrl } from '$lib/server/link-preview-url.js';

const FETCH_TIMEOUT_MS = 8_000;
const MAX_HTML_BYTES = 512_000;
const CACHE_TTL_MS = 3_600_000;
const MAX_REDIRECTS = 5;
const USER_AGENT = 'PennyLinkPreview/1.0';
const HTTP_PROTOCOL = 'http:';
const HTTPS_PROTOCOL = 'https:';
const GET_METHOD = 'GET';
const DEFAULT_HTTP_PORT = 80;
const DEFAULT_HTTPS_PORT = 443;
const DECIMAL_RADIX = 10;
const UNKNOWN_STATUS = 0;
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

type PreviewHttpResponse = {
	status: number;
	headers: Headers;
	body: Uint8Array;
};

type PreviewTransport = (
	url: URL,
	address: string,
	signal: AbortSignal
) => Promise<PreviewHttpResponse>;

const previewCache = new Map<string, CacheEntry>();
let previewTransport: PreviewTransport = requestPinnedPreviewUrl;

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
				if (isRedirectResponse(response.status)) {
					url = parseRedirectUrl(response, url, redirectCount);
					continue;
				}

				if (!isOkStatus(response.status)) {
					throw new Error(`preview fetch failed: ${response.status}`);
				}

			const contentType = response.headers.get('content-type') ?? '';
			if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
				throw new Error('preview response is not html');
			}

			return {
				html: new TextDecoder('utf-8', { fatal: false }).decode(response.body),
				url
			};
		}

		throw new Error('preview redirect limit exceeded');
	} finally {
		clearTimeout(timeout);
	}
}

async function fetchPreviewUrl(url: URL, signal: AbortSignal): Promise<PreviewHttpResponse> {
	const address = await resolvePublicAddress(url);
	return previewTransport(url, address, signal);
}

async function resolvePublicAddress(url: URL): Promise<string> {
	const addresses = await lookup(url.hostname, { all: true, verbatim: true });
	if (addresses.length === 0) {
		throw new ValidationError('url host is not allowed');
	}
	if (addresses.some((entry) => isBlockedPreviewHostname(entry.address.toLowerCase()))) {
		throw new ValidationError('url host is not allowed');
	}
	const firstAddress = addresses[0];
	if (!firstAddress) {
		throw new ValidationError('url host is not allowed');
	}
	return firstAddress.address;
}

function isOkStatus(status: number): boolean {
	return status >= 200 && status < 300;
}

function isRedirectResponse(status: number): boolean {
	return REDIRECT_STATUSES.has(status);
}

function parseRedirectUrl(response: PreviewHttpResponse, currentUrl: URL, redirectCount: number): URL {
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

function requestPinnedPreviewUrl(
	url: URL,
	address: string,
	signal: AbortSignal
): Promise<PreviewHttpResponse> {
	return new Promise((resolve, reject) => {
		const onResponse = (response: IncomingMessage) => {
			collectResponse(response, resolve, reject);
		};
		const request =
			url.protocol === HTTPS_PROTOCOL
				? httpsRequest(buildHttpsRequestOptions(url, address, signal), onResponse)
				: httpRequest(buildHttpRequestOptions(url, address, signal), onResponse);
		request.on('error', reject);
		request.end();
	});
}

function buildHttpRequestOptions(url: URL, address: string, signal: AbortSignal): HttpRequestOptions {
	return {
		protocol: url.protocol,
		hostname: address,
		port: readPort(url, DEFAULT_HTTP_PORT),
		path: requestPath(url),
		method: GET_METHOD,
		headers: requestHeaders(url),
		signal
	};
}

function buildHttpsRequestOptions(url: URL, address: string, signal: AbortSignal): HttpsRequestOptions {
	return {
		...buildHttpRequestOptions(url, address, signal),
		port: readPort(url, DEFAULT_HTTPS_PORT),
		servername: url.hostname
	};
}

function readPort(url: URL, defaultPort: number): number {
	return url.port ? Number.parseInt(url.port, DECIMAL_RADIX) : defaultPort;
}

function requestPath(url: URL): string {
	return `${url.pathname}${url.search}`;
}

function requestHeaders(url: URL): Record<string, string> {
	return {
		Accept: 'text/html,application/xhtml+xml',
		Host: url.host,
		'User-Agent': USER_AGENT
	};
}

function collectResponse(
	response: IncomingMessage,
	resolve: (response: PreviewHttpResponse) => void,
	reject: (error: Error) => void
): void {
	const chunks: Uint8Array[] = [];
	let total = 0;
	response.on('data', (chunk: Buffer | string) => {
		if (total >= MAX_HTML_BYTES) {
			return;
		}
		const bytes = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
		const remaining = MAX_HTML_BYTES - total;
		const slice = bytes.byteLength > remaining ? bytes.subarray(0, remaining) : bytes;
		chunks.push(slice);
		total += slice.byteLength;
	});
	response.on('end', () => {
		resolve({
			status: response.statusCode ?? UNKNOWN_STATUS,
			headers: headersFromIncoming(response.headers),
			body: mergeChunks(chunks, total)
		});
	});
	response.on('error', reject);
}

function headersFromIncoming(rawHeaders: IncomingHttpHeaders): Headers {
	const headers = new Headers();
	for (const [name, value] of Object.entries(rawHeaders)) {
		if (Array.isArray(value)) {
			for (const entry of value) {
				headers.append(name, entry);
			}
		} else if (typeof value === 'string') {
			headers.set(name, value);
		}
	}
	return headers;
}

function mergeChunks(chunks: Uint8Array[], total: number): Uint8Array {
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

export function setLinkPreviewTransportForTests(transport: PreviewTransport | null): void {
	previewTransport = transport ?? requestPinnedPreviewUrl;
}
