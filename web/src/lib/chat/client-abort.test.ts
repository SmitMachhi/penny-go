import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatClient } from './client.svelte.js';

const SESSION_KEY = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440000';
const RUN_ID = 'run-1';
const MESSAGE = 'hello penny';

function jsonResponse(body: unknown): Response {
	return Response.json(body);
}

describe('ChatClient optimistic abort', () => {
	beforeEach(() => {
		vi.stubGlobal('EventSource', class MockEventSource {
			close(): void {}
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('stops the UI immediately when abort is clicked', async () => {
		let resolveSend: (response: Response) => void = () => {};
		const sendResponse = new Promise<Response>((resolve) => {
			resolveSend = resolve;
		});
		const fetchMock = vi.fn<typeof fetch>(async (input) => {
			const path = String(input);
			if (path === '/api/chat/send') {
				return sendResponse;
			}
			return jsonResponse({});
		});
		vi.stubGlobal('fetch', fetchMock);

		const client = new ChatClient();
		client.state.sessionKey = SESSION_KEY;
		client.state.sessionId = 'session-1';

		const sendPromise = client.sendMessage(MESSAGE, { skipHistoryReload: true });
		expect(client.state.sending).toBe(true);

		await client.abortActiveRun();
		expect(client.state.sending).toBe(false);

		resolveSend(jsonResponse({ runId: RUN_ID, sessionKey: SESSION_KEY }));
		await sendPromise;

		expect(fetchMock).toHaveBeenCalledWith(
			'/api/chat/abort',
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ sessionKey: SESSION_KEY, runId: RUN_ID })
			})
		);
	});
});
