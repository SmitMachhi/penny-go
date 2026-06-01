import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiJson } from './api-client.js';

const TIMEOUT_MS = 5;

describe('apiJson', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.useRealTimers();
	});

	it('applies timeout when the caller provides an abort signal', async () => {
		vi.useFakeTimers();
		const caller = new AbortController();
		let requestSignal: AbortSignal | null = null;
		const fetchMock = vi.fn<typeof fetch>((_input, init) => {
			const signal = init?.signal;
			if (!(signal instanceof AbortSignal)) {
				throw new Error('request signal is required');
			}
			requestSignal = signal;
			return new Promise<Response>(() => {});
		});
		vi.stubGlobal('fetch', fetchMock);

		void apiJson('/slow', undefined, {
			signal: caller.signal,
			timeoutMs: TIMEOUT_MS
		});
		await vi.advanceTimersByTimeAsync(TIMEOUT_MS);

		expect(requestSignal?.aborted).toBe(true);
	});
});
