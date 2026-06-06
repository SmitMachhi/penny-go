import {
	EXA_CONTENTS_MAX_CHARACTERS,
	EXA_CONTENTS_TIMEOUT_MS
} from '../constants.js';

const EXA_CONTENTS_ENDPOINT = 'https://api.exa.ai/contents';
const EXA_INTEGRATION_HEADER = 'penny-go';

type ExaContentsResult = {
	title?: unknown;
	url?: unknown;
	text?: unknown;
	summary?: unknown;
};

type ExaContentsResponse = {
	results?: unknown;
};

export type ExaOfficialContentsResult =
	| {
			success: true;
			url: string;
			markdown: string;
			fetched_at: string;
			content_type: 'html';
			title?: string | undefined;
	  }
	| {
			success: false;
			url: string;
			error: string;
			fetched_at: string;
	  };

export async function readExaOfficialContents(input: {
	url: string;
	apiKey: string | undefined;
	signal?: AbortSignal | undefined;
}): Promise<ExaOfficialContentsResult> {
	const fetchedAt = new Date().toISOString();
	if (!input.apiKey) {
		return {
			success: false,
			url: input.url,
			error: 'missing_exa_api_key',
			fetched_at: fetchedAt
		};
	}

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), EXA_CONTENTS_TIMEOUT_MS);
	const removeAbort = attachAbortForwarder(input.signal, controller);
	try {
		const response = await fetch(EXA_CONTENTS_ENDPOINT, {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				'x-api-key': input.apiKey,
				'x-exa-integration': EXA_INTEGRATION_HEADER
			},
			body: JSON.stringify({
				urls: [input.url],
				text: { maxCharacters: EXA_CONTENTS_MAX_CHARACTERS }
			}),
			signal: controller.signal
		});

		if (!response.ok) {
			return {
				success: false,
				url: input.url,
				error: `exa_contents_http_${String(response.status)}`,
				fetched_at: fetchedAt
			};
		}

		return parseExaContentsPayload(await response.json(), input.url, fetchedAt);
	} catch (error) {
		return {
			success: false,
			url: input.url,
			error: error instanceof Error ? `exa_contents_failed: ${error.message}` : 'exa_contents_failed',
			fetched_at: fetchedAt
		};
	} finally {
		clearTimeout(timeout);
		removeAbort();
	}
}

function parseExaContentsPayload(
	payload: unknown,
	requestedUrl: string,
	fetchedAt: string
): ExaOfficialContentsResult {
	const result = firstExaResult(payload);
	if (!result) {
		return {
			success: false,
			url: requestedUrl,
			error: 'exa_contents_empty',
			fetched_at: fetchedAt
		};
	}

	const markdown = readString(result.text) ?? readString(result.summary);
	if (!markdown) {
		return {
			success: false,
			url: readString(result.url) ?? requestedUrl,
			error: 'exa_contents_empty_text',
			fetched_at: fetchedAt
		};
	}

	return {
		success: true,
		url: readString(result.url) ?? requestedUrl,
		markdown,
		fetched_at: fetchedAt,
		content_type: 'html',
		title: readString(result.title)
	};
}

function firstExaResult(payload: unknown): ExaContentsResult | null {
	if (!payload || typeof payload !== 'object') {
		return null;
	}
	const results = (payload as ExaContentsResponse).results;
	if (!Array.isArray(results)) {
		return null;
	}
	const result = results.find(
		(entry): entry is ExaContentsResult =>
			Boolean(entry && typeof entry === 'object' && !Array.isArray(entry))
	);
	return result ?? null;
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
