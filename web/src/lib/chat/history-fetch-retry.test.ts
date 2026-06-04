import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchHistoryWithRetry } from './history-fetch-retry.js';

vi.mock('$lib/chat/client-api.js', () => ({
	fetchHistory: vi.fn()
}));

import { fetchHistory } from '$lib/chat/client-api.js';

const SESSION_KEY = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440000';

describe('fetchHistoryWithRetry', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('retries until history succeeds', async () => {
		vi.mocked(fetchHistory)
			.mockRejectedValueOnce(new Error('timeout'))
			.mockResolvedValueOnce({ sessionKey: SESSION_KEY, messages: [] });

		const payload = await fetchHistoryWithRetry(SESSION_KEY, { retryDelaysMs: [0] });
		expect(payload.sessionKey).toBe(SESSION_KEY);
		expect(fetchHistory).toHaveBeenCalledTimes(2);
	});

	it('stops retrying when cancelled', async () => {
		vi.mocked(fetchHistory).mockRejectedValue(new Error('timeout'));
		let cancelled = false;

		await expect(
			fetchHistoryWithRetry(SESSION_KEY, {
				isCancelled: () => {
					if (!cancelled) {
						cancelled = true;
						return false;
					}
					return true;
				}
			})
		).rejects.toThrow('history fetch cancelled');
	});
});
