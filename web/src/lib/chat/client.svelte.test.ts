import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ArtifactSummary } from './artifacts.js';
import { ChatClient } from './client.svelte.js';
import type { SsePayload } from './stream-events.js';

const SESSION_KEY = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440000';
const OTHER_SESSION_KEY = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440001';
const SESSION_ID = 'session-1';
const RUN_ID = 'run-1';
const MESSAGE = 'hello penny';
const FIRST_ABORT_REQUEST = 1;
const ARTIFACT_ID = '00000000-0000-4000-8000-000000000001';

type ChatClientInternals = {
	finalizeAssistantMessage(payload: Extract<SsePayload, { type: 'chat.final' }>): Promise<void>;
};

function jsonResponse(body: unknown): Response {
	return Response.json(body);
}

function requestPath(input: RequestInfo | URL): string {
	return String(input);
}

function artifact(version: number): ArtifactSummary {
	return {
		artifactId: ARTIFACT_ID,
		title: 'Loaded brief',
		programCount: 0,
		version,
		latestVersion: version,
		updatedAt: '2026-06-01T00:00:00.000Z',
		pdfAvailable: false
	};
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
		client.state.operationError = 'failed to load artifacts';

		await client.sendMessage(MESSAGE, { skipHistoryReload: true });

		expect(fetchMock).toHaveBeenCalledWith(
			'/api/chat/send',
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ message: MESSAGE, sessionKey: SESSION_KEY, sessionId: null })
			})
		);
		expect(client.state.operationError).toBeNull();
	});

	it('skips history reload before send when sessionId is already known', async () => {
		const fetchMock = vi.fn<typeof fetch>(async (input) => {
			if (requestPath(input).startsWith('/api/chat/history')) {
				throw new Error('history should not reload');
			}
			return jsonResponse({ runId: RUN_ID, sessionKey: SESSION_KEY });
		});
		vi.stubGlobal('fetch', fetchMock);

		const client = new ChatClient();
		client.state.sessionKey = SESSION_KEY;
		client.state.sessionId = SESSION_ID;

		await client.sendMessage(MESSAGE);

		expect(fetchMock).not.toHaveBeenCalledWith(
			expect.stringContaining('/api/chat/history'),
			expect.anything()
		);
		expect(fetchMock).toHaveBeenCalledWith(
			'/api/chat/send',
			expect.objectContaining({ method: 'POST' })
		);
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

	it('reports no send when history reload fails', async () => {
		const fetchMock = vi.fn<typeof fetch>(async (input) => {
			if (requestPath(input).startsWith('/api/chat/history')) {
				return Response.json({ error: 'history unavailable' }, { status: 503 });
			}
			return jsonResponse({ runId: RUN_ID, sessionKey: SESSION_KEY });
		});
		vi.stubGlobal('fetch', fetchMock);

		const client = new ChatClient();
		client.state.sessionKey = SESSION_KEY;

		const sent = await client.sendMessage(MESSAGE);

		expect(sent).toBe(false);
		expect(fetchMock).not.toHaveBeenCalledWith(
			'/api/chat/send',
			expect.objectContaining({ method: 'POST' })
		);
		expect(client.state.messages).toEqual([]);
	});

	it('does not let stale session clearing erase a newer session', async () => {
		let abortRequests = 0;
		let resolveFirstAbort: (() => void) | undefined;
		const firstAbortResponse = new Promise<Response>((resolve) => {
			resolveFirstAbort = () => resolve(jsonResponse({}));
		});
		const fetchMock = vi.fn<typeof fetch>(async (input) => {
			const path = requestPath(input);
			if (path === '/api/chat/send') {
				return jsonResponse({ runId: RUN_ID, sessionKey: SESSION_KEY });
			}
			if (path === '/api/chat/abort') {
				abortRequests += 1;
				return abortRequests === FIRST_ABORT_REQUEST ? firstAbortResponse : jsonResponse({});
			}
			if (path.startsWith('/api/chat/history')) {
				return jsonResponse({ sessionKey: OTHER_SESSION_KEY, messages: [] });
			}
			if (path.startsWith('/api/artifacts')) {
				return jsonResponse({ artifacts: [] });
			}
			return jsonResponse({});
		});
		vi.stubGlobal('fetch', fetchMock);

		const client = new ChatClient();
		client.state.sessionKey = SESSION_KEY;
		await client.sendMessage(MESSAGE, { skipHistoryReload: true });

		const clearPromise = client.clearSession();
		await client.switchSession(OTHER_SESSION_KEY);
		if (!resolveFirstAbort) {
			throw new Error('first abort was not requested');
		}
		resolveFirstAbort();
		await clearPromise;

		expect(client.state.sessionKey).toBe(OTHER_SESSION_KEY);
	});

	it('does not reconnect when switching to the active session', async () => {
		const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse({}));
		vi.stubGlobal('fetch', fetchMock);

		const client = new ChatClient();
		client.state.sessionKey = SESSION_KEY;
		client.state.artifacts = [
			{
				artifactId: '00000000-0000-4000-8000-000000000001',
				title: 'Loaded brief',
				programCount: 0,
				version: 1,
				latestVersion: 1,
				updatedAt: '2026-06-01T00:00:00.000Z',
				pdfAvailable: false
			}
		];

		await client.switchSession(SESSION_KEY);

		expect(fetchMock).not.toHaveBeenCalled();
		expect(client.state.sessionKey).toBe(SESSION_KEY);
	});

	it('does not reopen unchanged artifacts after a final reply', async () => {
		const reloadedArtifact = { ...artifact(1), title: 'Reloaded brief' };
		const fetchMock = vi.fn<typeof fetch>(async (input) => {
			const path = requestPath(input);
			if (path === '/api/chat/send') {
				return jsonResponse({ runId: RUN_ID, sessionKey: SESSION_KEY });
			}
			if (path.startsWith('/api/artifacts')) {
				return jsonResponse({ artifacts: [reloadedArtifact] });
			}
			return jsonResponse({});
		});
		vi.stubGlobal('fetch', fetchMock);

		const client = new ChatClient();
		client.state.sessionKey = SESSION_KEY;
		client.state.artifacts = [artifact(1)];
		client.state.activeArtifactId = ARTIFACT_ID;
		client.state.artifactPanelOpen = false;
		await client.sendMessage(MESSAGE, { skipHistoryReload: true });

		await (client as unknown as ChatClientInternals).finalizeAssistantMessage({
			type: 'chat.final',
			runId: RUN_ID,
			text: 'No artifact update.'
		});
		await vi.waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				`/api/artifacts?sessionKey=${encodeURIComponent(SESSION_KEY)}`,
				expect.objectContaining({ signal: expect.any(AbortSignal) })
			)
		);
		await vi.waitFor(() => expect(client.state.artifacts[0]?.title).toBe('Reloaded brief'));

		expect(client.state.artifactPanelOpen).toBe(false);
	});
});
