import type { LinkPreview } from '$lib/link-preview/types.js';
import { parseLinkPreviewFromHtml } from '$lib/server/link-preview-parse.js';
import { parsePreviewableUrl } from '$lib/server/link-preview-url.js';

const FETCH_TIMEOUT_MS = 8_000;
const MAX_HTML_BYTES = 512_000;
const CACHE_TTL_MS = 3_600_000;
const USER_AGENT = 'PennyLinkPreview/1.0';

type CacheEntry = {
	preview: LinkPreview;
	expiresAt: number;
};

const previewCache = new Map<string, CacheEntry>();

export async function fetchLinkPreview(rawUrl: string): Promise<LinkPreview> {
	const url = parsePreviewableUrl(rawUrl);
	const cacheKey = url.toString();
	const cached = previewCache.get(cacheKey);
	if (cached && cached.expiresAt > Date.now()) {
		return cached.preview;
	}

	const html = await downloadHtml(url);
	const preview = parseLinkPreviewFromHtml(html, url);
	previewCache.set(cacheKey, { preview, expiresAt: Date.now() + CACHE_TTL_MS });
	return preview;
}

async function downloadHtml(url: URL): Promise<string> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

	try {
		const response = await fetch(url, {
			signal: controller.signal,
			headers: {
				Accept: 'text/html,application/xhtml+xml',
				'User-Agent': USER_AGENT
			},
			redirect: 'follow'
		});

		if (!response.ok) {
			throw new Error(`preview fetch failed: ${response.status}`);
		}

		const contentType = response.headers.get('content-type') ?? '';
		if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
			throw new Error('preview response is not html');
		}

		const buffer = await readLimitedBody(response, MAX_HTML_BYTES);
		return new TextDecoder('utf-8', { fatal: false }).decode(buffer);
	} finally {
		clearTimeout(timeout);
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
