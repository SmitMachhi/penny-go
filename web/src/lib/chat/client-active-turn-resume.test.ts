import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	reconcileActiveTurnFromHistory,
	shouldApplyBootstrapMessages
} from './client-active-turn-resume.js';
import { ChatClient } from './client.svelte.js';
import { createInitialChatState } from './client-state.js';
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

describe('active turn resume helpers', () => {
	it('does not append a duplicate user message when progress commentary follows it', () => {
		const state = createInitialChatState();
		state.messages = [
			{ id: 'user-1', role: 'user', text: ACTIVE_MESSAGE },
			{
				id: 'assistant-1',
				role: 'assistant',
				text: 'Searching the corpus.',
				phase: 'commentary'
			}
		];

		reconcileActiveTurnFromHistory(
			state,
			{
				turnId: 'turn-1',
				runId: RUN_ID,
				status: 'running',
				message: ACTIVE_MESSAGE
			},
			null
		);

		expect(state.messages.filter((message) => message.role === 'user')).toHaveLength(1);
	});

	it('replaces stale local threads that picked up an extra optimistic user message', () => {
		expect(
			shouldApplyBootstrapMessages({
				localUserCount: 2,
				remoteUserCount: 1,
				hasActiveTurn: false
			})
		).toBe(true);
	});
});

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

	it('does not resume awaiting UI from history alone without a backend active turn', async () => {
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

		await vi.waitFor(() => expect(client.state.loading).toBe(false));
		expect(client.state.sending).toBe(false);
		expect(client.state.messages.some((message) => message.role === 'user')).toBe(true);
	});

	it('hydrates run progress when bootstrap includes activeRunProgress', async () => {
		const fetchMock = vi.fn<typeof fetch>(async (input) => {
			const path = requestPath(input);
			if (path.startsWith('/api/sessions')) {
				return jsonResponse({
					sessionKey: SESSION_KEY,
					sessionId: SESSION_ID,
					messages: [
						{ id: 'user-1', role: 'user', text: ACTIVE_MESSAGE },
						{
							id: 'assistant-1',
							role: 'assistant',
							text: 'Searching the corpus.',
							phase: 'commentary'
						}
					],
					activeTurn: {
						turnId: 'turn-1',
						runId: RUN_ID,
						status: 'running',
						message: ACTIVE_MESSAGE
					},
					activeRunProgress: {
						tools: [{ id: 'tool-1', name: 'search_corpus', phase: 'running' }],
						runTrace: { segments: [], liveSegment: 'Searching the corpus.' },
						streamingAnswerText: 'Searching the corpus.',
						inProgressMessages: [
							{
								id: 'assistant-1',
								role: 'assistant',
								text: 'Searching the corpus.',
								phase: 'commentary'
							}
						]
					}
				});
			}
			return jsonResponse({});
		});
		vi.stubGlobal('fetch', fetchMock);

		const client = new ChatClient();
		await client.switchSession(SESSION_KEY);

		await vi.waitFor(() => expect(client.state.sending).toBe(true));
		expect(client.state.messages.filter((message) => message.role === 'user')).toHaveLength(1);
		expect(client.state.tools).toEqual([
			{ id: 'tool-1', name: 'search_corpus', phase: 'running' }
		]);
		expect(client.state.runTrace.liveSegment).toBe('Searching the corpus.');
		expect(client.state.streamingAnswerText).toBe('Searching the corpus.');
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

	it('submits a new session first turn before route bootstrap', async () => {
		const fetchMock = vi.fn<typeof fetch>(async () =>
			jsonResponse({ runId: RUN_ID, sessionKey: SESSION_KEY })
		);
		vi.stubGlobal('fetch', fetchMock);
		const client = new ChatClient();

		await client.startSessionWithMessage(SESSION_KEY, ACTIVE_MESSAGE, 'turn-1');

		expect(fetchMock).toHaveBeenCalledWith(
			'/api/chat/send',
			expect.objectContaining({
				body: JSON.stringify({
					message: ACTIVE_MESSAGE,
					sessionKey: SESSION_KEY,
					sessionId: null,
					turnId: 'turn-1'
				}),
				method: 'POST'
			})
		);
	});
});
