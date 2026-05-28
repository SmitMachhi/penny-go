import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatClient } from './client.svelte.js';

const SESSION_KEY = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440000';
const OTHER_SESSION_KEY = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440001';
const SESSION_ID = 'session-1';
const RUN_ID = 'run-1';
const MESSAGE = 'hello penny';

function jsonResponse(body: unknown): Response {
	return Response.json(body);
}

function requestPath(input: RequestInfo | URL): string {
	return String(input);
}

describe('ChatClient', () => {
	beforeEach(() => {
		vi.stubGlobal('EventSource', class MockEventSource {
			close(): void {}
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('aborts an active run before clearing the session', async () => {
		const fetchMock = vi.fn<typeof fetch>(async (input) => {
			if (requestPath(input) === '/api/chat/send') {
				return jsonResponse({ runId: RUN_ID, sessionKey: SESSION_KEY });
			}
			return jsonResponse({});
		});
		vi.stubGlobal('fetch', fetchMock);

		const client = new ChatClient();
		client.state.sessionKey = SESSION_KEY;
		client.state.sessionId = SESSION_ID;

		await client.sendMessage(MESSAGE, { skipHistoryReload: true });
		await client.clearSession();

		expect(fetchMock).toHaveBeenCalledWith(
			'/api/chat/abort',
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ sessionKey: SESSION_KEY, runId: RUN_ID })
			})
		);
		expect(client.state.sessionKey).toBe('');
	});

	it('sends the first home message when a stale load error exists', async () => {
		const fetchMock = vi.fn<typeof fetch>(async () =>
			jsonResponse({ runId: RUN_ID, sessionKey: SESSION_KEY })
		);
		vi.stubGlobal('fetch', fetchMock);

		const client = new ChatClient();
		client.state.sessionKey = SESSION_KEY;
		client.state.error = 'failed to load artifacts';

		await client.sendMessage(MESSAGE, { skipHistoryReload: true });

		expect(fetchMock).toHaveBeenCalledWith(
			'/api/chat/send',
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ message: MESSAGE, sessionKey: SESSION_KEY, sessionId: null })
			})
		);
		expect(client.state.error).toBeNull();
	});

	it('does not send when the active session changes during history reload', async () => {
		const client = new ChatClient();
		const fetchMock = vi.fn<typeof fetch>(async (input) => {
			if (requestPath(input).startsWith('/api/chat/history')) {
				client.state.sessionKey = OTHER_SESSION_KEY;
				return jsonResponse({ sessionKey: SESSION_KEY, messages: [] });
			}
			return jsonResponse({ runId: RUN_ID, sessionKey: OTHER_SESSION_KEY });
		});
		vi.stubGlobal('fetch', fetchMock);
		client.state.sessionKey = SESSION_KEY;

		await client.sendMessage(MESSAGE);

		expect(fetchMock).not.toHaveBeenCalledWith(
			'/api/chat/send',
			expect.objectContaining({ method: 'POST' })
		);
		expect(client.state.messages).toEqual([]);
	});
});
