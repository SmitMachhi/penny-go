import type { HistoryResponse } from '$lib/chat/client-api.js';
import { fetchHistory } from '$lib/chat/client-api.js';

const HISTORY_RETRY_INITIAL_MS = 1_000;
const HISTORY_RETRY_MAX_MS = 8_000;
const HISTORY_RETRY_MAX_ATTEMPTS = 5;

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

export type HistoryFetchRetryOptions = {
	isCancelled?: () => boolean;
	/** Overrides backoff delays between attempts (for tests). */
	retryDelaysMs?: readonly number[];
};

export async function fetchHistoryWithRetry(
	sessionKey: string,
	options?: HistoryFetchRetryOptions
): Promise<HistoryResponse> {
	const retryDelaysMs = options?.retryDelaysMs ?? buildDefaultRetryDelays();
	let lastError: unknown;

	for (let attempt = 0; attempt < HISTORY_RETRY_MAX_ATTEMPTS; attempt += 1) {
		if (options?.isCancelled?.()) {
			throw new Error('history fetch cancelled');
		}
		try {
			return await fetchHistory(sessionKey);
		} catch (error) {
			lastError = error;
			const isLastAttempt = attempt === HISTORY_RETRY_MAX_ATTEMPTS - 1;
			if (isLastAttempt) {
				break;
			}
			const delayMs = retryDelaysMs[attempt] ?? HISTORY_RETRY_MAX_MS;
			if (delayMs > 0) {
				await sleep(delayMs);
			}
			if (options?.isCancelled?.()) {
				throw new Error('history fetch cancelled');
			}
		}
	}

	throw lastError instanceof Error ? lastError : new Error('failed to load chat history');
}

function buildDefaultRetryDelays(): number[] {
	const delays: number[] = [];
	let delayMs = HISTORY_RETRY_INITIAL_MS;
	for (let attempt = 0; attempt < HISTORY_RETRY_MAX_ATTEMPTS - 1; attempt += 1) {
		delays.push(delayMs);
		delayMs = Math.min(delayMs * 2, HISTORY_RETRY_MAX_MS);
	}
	return delays;
}
