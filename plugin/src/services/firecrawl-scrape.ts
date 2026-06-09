import {
	FIRECRAWL_SCRAPE_MAX_CHARACTERS,
	FIRECRAWL_SCRAPE_TIMEOUT_MS
} from '../constants.js';

const FIRECRAWL_SCRAPE_ENDPOINT = 'https://api.firecrawl.dev/v2/scrape';

export type FirecrawlScrapeResult =
	| {
			success: true;
			url: string;
			markdown: string;
			fetched_at: string;
			content_type: 'html';
	  }
	| {
			success: false;
			url: string;
			error: string;
			fetched_at: string;
	  };

export async function readFirecrawlScrape(input: {
	url: string;
	apiKey: string | undefined;
	signal?: AbortSignal | undefined;
}): Promise<FirecrawlScrapeResult> {
	const fetchedAt = new Date().toISOString();
	if (!input.apiKey) {
		return {
			success: false,
			url: input.url,
			error: 'missing_firecrawl_api_key',
			fetched_at: fetchedAt
		};
	}

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), FIRECRAWL_SCRAPE_TIMEOUT_MS);
	const removeAbort = attachAbortForwarder(input.signal, controller);
	try {
		const response = await fetch(FIRECRAWL_SCRAPE_ENDPOINT, {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				Authorization: `Bearer ${input.apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				url: input.url,
				formats: ['markdown'],
				onlyMainContent: true,
				parsers: ['pdf'],
				timeout: FIRECRAWL_SCRAPE_TIMEOUT_MS,
				removeBase64Images: true,
				blockAds: true
			}),
			signal: controller.signal
		});

		const payload = await readJsonPayload(response);
		if (!response.ok) {
			return {
				success: false,
				url: input.url,
				error: readString(payload?.error) ?? `firecrawl_scrape_http_${String(response.status)}`,
				fetched_at: fetchedAt
			};
		}

		return parseFirecrawlPayload(payload, input.url, fetchedAt);
	} catch (error) {
		return {
			success: false,
			url: input.url,
			error:
				error instanceof Error ? `firecrawl_scrape_failed: ${error.message}` : 'firecrawl_scrape_failed',
			fetched_at: fetchedAt
		};
	} finally {
		clearTimeout(timeout);
		removeAbort();
	}
}

async function readJsonPayload(response: Response): Promise<Record<string, unknown> | null> {
	try {
		return readRecord(await response.json());
	} catch {
		return null;
	}
}

function parseFirecrawlPayload(
	payload: Record<string, unknown> | null,
	requestedUrl: string,
	fetchedAt: string
): FirecrawlScrapeResult {
	if (!payload) {
		return {
			success: false,
			url: requestedUrl,
			error: 'firecrawl_scrape_empty',
			fetched_at: fetchedAt
		};
	}

	const data = readRecord(payload.data);
	const metadata = readRecord(data?.metadata) ?? readRecord(payload.metadata);
	const markdown = readString(data?.markdown) ?? readString(payload.markdown);
	if (!markdown) {
		return {
			success: false,
			url: readReturnedUrl(data, metadata) ?? requestedUrl,
			error: 'firecrawl_scrape_empty_markdown',
			fetched_at: fetchedAt
		};
	}

	return {
		success: true,
		url: readReturnedUrl(data, metadata) ?? requestedUrl,
		markdown: trimToMaxCharacters(markdown),
		fetched_at: fetchedAt,
		content_type: 'html'
	};
}

function readReturnedUrl(
	data: Record<string, unknown> | null,
	metadata: Record<string, unknown> | null
): string | undefined {
	return (
		readString(data?.url) ??
		readString(metadata?.sourceURL) ??
		readString(metadata?.url)
	);
}

function trimToMaxCharacters(value: string): string {
	return value.length > FIRECRAWL_SCRAPE_MAX_CHARACTERS
		? value.slice(0, FIRECRAWL_SCRAPE_MAX_CHARACTERS)
		: value;
}

function readRecord(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return null;
	}
	return Object.fromEntries(Object.entries(value));
}

function readString(value: unknown): string | undefined {
	if (typeof value !== 'string') {
		return undefined;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function attachAbortForwarder(
	signal: AbortSignal | undefined,
	controller: AbortController
): () => void {
	if (!signal) {
		return () => undefined;
	}
	if (signal.aborted) {
		controller.abort();
		return () => undefined;
	}
	const onAbort = () => controller.abort();
	signal.addEventListener('abort', onAbort, { once: true });
	return () => signal.removeEventListener('abort', onAbort);
}
