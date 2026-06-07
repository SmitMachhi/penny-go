import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatClient } from './client.svelte.js';
import { clearSessionThreadCache } from './session-thread-cache.js';

const SESSION_KEY = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440000';
const SESSION_ID = 'session-1';
const RUN_ID = 'run-1';
const ACTIVE_MESSAGE = 'still running';

function jsonResponse(body: unknown): Response {
	return Response.json(body);
}

function requestPath(input: RequestInfo | URL): string {
	return String(input);
}

describe('ChatClient active turn resume', () => {
	beforeEach(() => {
		clearSessionThreadCache(SESSION_KEY);
		vi.stubGlobal('EventSource', class MockEventSource {
			close(): void {}
		});
	});

	afterEach(() => {
		clearSessionThreadCache(SESSION_KEY);
		vi.unstubAllGlobals();
	});

	it('resumes awaiting UI when history has a pending user turn', async () => {
		const fetchMock = vi.fn<typeof fetch>(async (input) => {
			const path = requestPath(input);
			if (path.startsWith('/api/sessions')) {
				return jsonResponse({
					sessionKey: SESSION_KEY,
					sessionId: SESSION_ID,
					messages: [{ id: 'user-1', role: 'user', text: ACTIVE_MESSAGE }]
				});
			}
			return jsonResponse({});
		});
		vi.stubGlobal('fetch', fetchMock);

		const client = new ChatClient();
		await client.switchSession(SESSION_KEY);

		await vi.waitFor(() => expect(client.state.sending).toBe(true));
		expect(client.state.messages.some((message) => message.role === 'user')).toBe(true);
	});

	it('resumes awaiting UI from a backend active turn when history is empty', async () => {
		const fetchMock = vi.fn<typeof fetch>(async (input) => {
			const path = requestPath(input);
			if (path.startsWith('/api/sessions')) {
				return jsonResponse({
					sessionKey: SESSION_KEY,
					sessionId: SESSION_ID,
					messages: [],
					activeTurn: {
						turnId: 'turn-1',
						runId: RUN_ID,
						status: 'running',
						message: ACTIVE_MESSAGE
					}
				});
			}
			return jsonResponse({});
		});
		vi.stubGlobal('fetch', fetchMock);

		const client = new ChatClient();
		await client.switchSession(SESSION_KEY);

		await vi.waitFor(() => expect(client.state.sending).toBe(true));
		expect(client.state.messages).toEqual([
			expect.objectContaining({ role: 'user', text: ACTIVE_MESSAGE })
		]);
	});
});
