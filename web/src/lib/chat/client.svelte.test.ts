import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ArtifactSummary } from './artifacts.js';
import { RUN_RECOVERY_POLL_MS } from './client-run-recovery.js';
import { ChatClient } from './client.svelte.js';
import type { SsePayload } from './stream-events.js';

const SESSION_KEY = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440000';
const OTHER_SESSION_KEY = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440001';
const SESSION_ID = 'session-1';
const RUN_ID = 'run-1';
const MESSAGE = 'hello penny';
const FIRST_ABORT_REQUEST = 1;
const ARTIFACT_ID = '00000000-0000-4000-8000-000000000001';
const UPDATED_ARTIFACT_VERSION = 3;

type ChatClientInternals = {
	finalizeAssistantMessage(payload: Extract<SsePayload, { type: 'chat.final' }>): Promise<void>;
	handleStreamEvent(payload: SsePayload): void;
};

function jsonResponse(body: unknown): Response {
	return Response.json(body);
}

function requestPath(input: RequestInfo | URL): string {
	return String(input);
}

function requestBody(init: RequestInit | undefined): unknown {
	return JSON.parse(String(init?.body));
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

async function expectMissedArtifactToolLoadsArtifact(
	toolName: string,
	toolEventType: 'tool.start' | 'tool.done' = 'tool.done'
): Promise<void> {
	const loadedArtifact = artifact(UPDATED_ARTIFACT_VERSION);
	const fetchMock = vi.fn<typeof fetch>(async (input) => {
		const path = requestPath(input);
		if (path === '/api/chat/send') {
			return jsonResponse({ runId: RUN_ID, sessionKey: SESSION_KEY });
		}
		if (path.startsWith('/api/artifacts')) {
			return jsonResponse({ artifacts: [loadedArtifact] });
		}
		return jsonResponse({});
	});
	vi.stubGlobal('fetch', fetchMock);

	const client = new ChatClient();
	client.state.sessionKey = SESSION_KEY;
	client.state.sessionId = SESSION_ID;
	await client.sendMessage(MESSAGE, { skipHistoryReload: true });
	(client as unknown as ChatClientInternals).handleStreamEvent({
		type: toolEventType,
		runId: RUN_ID,
		name: toolName
	});

	await (client as unknown as ChatClientInternals).finalizeAssistantMessage({
		type: 'chat.final',
		runId: RUN_ID,
		text: 'Done. The artifact panel has the full plan.'
	});

	expect(fetchMock.mock.calls.map(([input]) => requestPath(input))).toContain(
		`/api/artifacts?sessionKey=${encodeURIComponent(SESSION_KEY)}`
	);
	expect(client.state.activeArtifactId).toBe(ARTIFACT_ID);
	expect(client.state.artifactPanelOpen).toBe(true);
	expect(client.state.messages.at(-1)?.artifactIds).toEqual([ARTIFACT_ID]);
}

describe('ChatClient', () => {
	beforeEach(() => {
		vi.stubGlobal('EventSource', class MockEventSource {
			close(): void {}
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.useRealTimers();
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
				body: expect.any(String)
			})
		);
		expect(requestBody(fetchMock.mock.calls[0]?.[1])).toMatchObject({
			message: MESSAGE,
			sessionKey: SESSION_KEY,
			sessionId: null,
			turnId: expect.any(String)
		});
		expect(client.state.operationError).toBeNull();
	});

	it('skips history reload before send when sessionId is already known', async () => {
		const fetchMock = vi.fn<typeof fetch>(async (input) => {
			if (requestPath(input).startsWith('/api/sessions')) {
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
			expect.stringContaining('/api/sessions'),
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
			if (requestPath(input).startsWith('/api/sessions')) {
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
		vi.useFakeTimers();
		const fetchMock = vi.fn<typeof fetch>(async (input) => {
			if (requestPath(input).startsWith('/api/sessions')) {
				return Response.json({ error: 'history unavailable' }, { status: 503 });
			}
			return jsonResponse({ runId: RUN_ID, sessionKey: SESSION_KEY });
		});
		vi.stubGlobal('fetch', fetchMock);

		const client = new ChatClient();
		client.state.sessionKey = SESSION_KEY;

		const sentPromise = client.sendMessage(MESSAGE);
		await vi.runAllTimersAsync();
		const sent = await sentPromise;
		vi.useRealTimers();

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
			if (path.startsWith('/api/sessions')) {
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

	it('loads history and artifact summaries when switching sessions', async () => {
		const fetchMock = vi.fn<typeof fetch>(async (input) => {
			const path = requestPath(input);
			if (path.startsWith('/api/sessions')) {
				return jsonResponse({
					sessionKey: SESSION_KEY,
					sessionId: SESSION_ID,
					messages: [],
					artifacts: [artifact(UPDATED_ARTIFACT_VERSION)]
				});
			}
			if (path.startsWith('/api/artifacts')) {
				throw new Error('artifacts should not load on session switch');
			}
			return jsonResponse({});
		});
		vi.stubGlobal('fetch', fetchMock);

		const client = new ChatClient();
		await client.switchSession(SESSION_KEY);

		await vi.waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				`/api/sessions/${encodeURIComponent(SESSION_KEY)}/bootstrap`,
				expect.objectContaining({ signal: expect.any(AbortSignal) })
			)
		);
		expect(fetchMock.mock.calls.map(([input]) => requestPath(input))).not.toContain(
			`/api/artifacts?sessionKey=${encodeURIComponent(SESSION_KEY)}`
		);
		await vi.waitFor(() => expect(client.state.activeArtifactId).toBe(ARTIFACT_ID));
		expect(client.state.artifacts).toEqual([artifact(UPDATED_ARTIFACT_VERSION)]);
		expect(client.state.artifactPanelOpen).toBe(false);
	});

	it('does not reload unchanged artifacts after a final reply', async () => {
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

		expect(fetchMock.mock.calls.map(([input]) => requestPath(input))).not.toContain(
			`/api/artifacts?sessionKey=${encodeURIComponent(SESSION_KEY)}`
		);
		expect(client.state.artifacts[0]?.title).toBe('Loaded brief');
		expect(client.state.artifactPanelOpen).toBe(false);
	});

	it('loads and opens a funding brief when the artifact stream event was missed', async () => {
		await expectMissedArtifactToolLoadsArtifact('create_funding_brief');
	});

	it('loads and opens a funding brief after a missed publish stream event', async () => {
		await expectMissedArtifactToolLoadsArtifact('publish_funding_brief');
	});

	it('loads and opens a funding brief after only a publish start event', async () => {
		await expectMissedArtifactToolLoadsArtifact('publish_funding_brief', 'tool.start');
	});

	it('does not append a final brief reply after the active session changes', async () => {
		let resolveArtifactLoad: (response: Response) => void = () => {};
		const artifactLoad = new Promise<Response>((resolve) => {
			resolveArtifactLoad = resolve;
		});
		const fetchMock = vi.fn<typeof fetch>(async (input) => {
			const path = requestPath(input);
			if (path === '/api/chat/send') {
				return jsonResponse({ runId: RUN_ID, sessionKey: SESSION_KEY });
			}
			if (path.startsWith('/api/artifacts')) {
				return artifactLoad;
			}
			return jsonResponse({});
		});
		vi.stubGlobal('fetch', fetchMock);

		const client = new ChatClient();
		client.state.sessionKey = SESSION_KEY;
		client.state.sessionId = SESSION_ID;
		await client.sendMessage(MESSAGE, { skipHistoryReload: true });
		client.state.tools = [{ id: 'tool-1', name: 'create_funding_brief', phase: 'done' }];

		const finalPromise = (client as unknown as ChatClientInternals).finalizeAssistantMessage({
			type: 'chat.final',
			runId: RUN_ID,
			text: 'Done. The artifact panel has the full plan.'
		});
		await vi.waitFor(() =>
			expect(fetchMock.mock.calls.map(([input]) => requestPath(input))).toContain(
				`/api/artifacts?sessionKey=${encodeURIComponent(SESSION_KEY)}`
			)
		);
		client.state.sessionKey = OTHER_SESSION_KEY;
		resolveArtifactLoad(jsonResponse({ artifacts: [artifact(UPDATED_ARTIFACT_VERSION)] }));
		await finalPromise;

		expect(client.state.messages.map((message) => message.text)).toEqual([MESSAGE]);
		expect(client.state.activeArtifactId).toBeNull();
	});

	it('keeps tool-use progress in the active turn instead of finalizing the reply', async () => {
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

		(client as unknown as ChatClientInternals).handleStreamEvent({
			type: 'chat.progress',
			runId: RUN_ID,
			text: 'I now have enough verified data. Let me create the plan.'
		});

		expect(client.state.sending).toBe(true);
		expect(client.state.streamingAnswerText).toBe('');
		expect(client.state.messages.map((message) => message.text)).toEqual([MESSAGE]);
		expect(client.state.runTrace.liveSegment).toBe(
			'I now have enough verified data. Let me create the plan.'
		);
	});

	it('does not recover a pre-response stream event from stale history', async () => {
		vi.useFakeTimers();
		let resolveSend: (response: Response) => void = () => {};
		const sendResponse = new Promise<Response>((resolve) => {
			resolveSend = resolve;
		});
		const fetchMock = vi.fn<typeof fetch>(async (input) => {
			const path = requestPath(input);
			if (path === '/api/chat/send') {
				return sendResponse;
			}
			if (path.startsWith('/api/sessions')) {
				return jsonResponse({
					sessionKey: SESSION_KEY,
					messages: [
						{ id: 'old-user', role: 'user', text: 'old question' },
						{ id: 'old-assistant', role: 'assistant', text: 'old answer' }
					]
				});
			}
			return jsonResponse({});
		});
		vi.stubGlobal('fetch', fetchMock);

		const client = new ChatClient();
		client.state.sessionKey = SESSION_KEY;
		client.state.sessionId = SESSION_ID;
		client.state.messages = [
			{ id: 'old-user', role: 'user', text: 'old question' },
			{ id: 'old-assistant', role: 'assistant', text: 'old answer' }
		];
		void client.sendMessage(MESSAGE, { skipHistoryReload: true });
		await vi.waitFor(() => expect(client.state.sending).toBe(true));

		(client as unknown as ChatClientInternals).handleStreamEvent({
			type: 'thinking.delta',
			runId: RUN_ID,
			text: 'thinking'
		});
		await vi.advanceTimersByTimeAsync(RUN_RECOVERY_POLL_MS);

		expect(client.state.sending).toBe(true);
		expect(client.state.messages.map((message) => message.text)).toEqual([
			'old question',
			'old answer',
			MESSAGE
		]);
		resolveSend(jsonResponse({ runId: RUN_ID, sessionKey: SESSION_KEY }));
	});

	it('resumes awaiting UI when history has a pending user turn', async () => {
		const fetchMock = vi.fn<typeof fetch>(async (input) => {
			const path = requestPath(input);
			if (path.startsWith('/api/sessions')) {
				return jsonResponse({
					sessionKey: SESSION_KEY,
					sessionId: SESSION_ID,
					messages: [{ id: 'user-1', role: 'user', text: 'still running' }]
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
});
