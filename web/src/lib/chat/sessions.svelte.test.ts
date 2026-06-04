import { afterEach, describe, expect, it, vi } from 'vitest';

import { SessionClient } from './sessions.svelte.js';

const SESSION_KEY = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440001';
const OTHER_SESSION_KEY = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440002';
const INITIAL_UPDATED_AT = 100;
const TITLE = 'Ontario SaaS grant help';

function jsonResponse(body: unknown, init?: ResponseInit): Response {
	return Response.json(body, init);
}

describe('SessionClient', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('reverts failed optimistic title saves so the title can retry', async () => {
		let patchRequests = 0;
		const fetchMock = vi.fn<typeof fetch>(async () => {
			patchRequests += 1;
			if (patchRequests === 1) {
				return jsonResponse({ error: 'gateway offline' }, { status: 503 });
			}
			return jsonResponse({});
		});
		vi.stubGlobal('fetch', fetchMock);
		const client = new SessionClient();
		client.state.sessions = [
			{
				key: SESSION_KEY,
				title: 'New chat',
				titleStatus: 'ready',
				updatedAt: INITIAL_UPDATED_AT,
				isLegacy: false
			}
		];

		client.setTitleFromFirstMessage(SESSION_KEY, TITLE);
		await vi.waitFor(() => expect(patchRequests).toBe(1));
		await vi.waitFor(() => expect(client.state.sessions[0]?.title).toBe('New chat'));

		client.setTitleFromFirstMessage(SESSION_KEY, TITLE);
		await vi.waitFor(() => expect(patchRequests).toBe(2));

		expect(client.state.sessions[0]?.title).toBe(TITLE);
	});

	it('auto-uniqueifies duplicate first-message titles', async () => {
		const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse({}));
		vi.stubGlobal('fetch', fetchMock);
		const client = new SessionClient();
		client.state.sessions = [
			{
				key: 'agent:main:penny:11111111-1111-1111-1111-111111111111',
				title: 'yo',
				titleStatus: 'ready',
				updatedAt: 1,
				isLegacy: false
			},
			{
				key: SESSION_KEY,
				title: 'New chat',
				titleStatus: 'ready',
				updatedAt: INITIAL_UPDATED_AT,
				isLegacy: false
			}
		];

		client.setTitleFromFirstMessage(SESSION_KEY, 'yo');
		await vi.waitFor(() =>
			expect(client.state.sessions.find((session) => session.key === SESSION_KEY)?.title).toBe(
				'yo (2)'
			)
		);
		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());

		const patchCall = fetchMock.mock.calls.find(([input]) => {
			if (typeof input !== 'string') {
				return false;
			}
			return input.includes(`/api/sessions/${encodeURIComponent(SESSION_KEY)}`);
		});
		expect(patchCall).toBeDefined();
		const init = patchCall?.[1];
		const body =
			typeof init?.body === 'string' ? (JSON.parse(init.body) as { label?: string }) : {};
		expect(body.label).toBe('yo (2)');
		expect(client.state.error).toBeNull();
	});

	it('does not refresh the full session list after local CRUD succeeds', async () => {
		const session = {
			key: SESSION_KEY,
			title: 'New chat',
			titleStatus: 'ready' as const,
			updatedAt: INITIAL_UPDATED_AT,
			isLegacy: false
		};
		const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
			const path = String(input);
			if (path === '/api/sessions' && init?.method === 'POST') {
				return jsonResponse({ session });
			}
			if (path.includes(encodeURIComponent(SESSION_KEY)) && init?.method === 'PATCH') {
				return jsonResponse({});
			}
			if (path.includes(encodeURIComponent(SESSION_KEY)) && init?.method === 'DELETE') {
				return jsonResponse({});
			}
			return jsonResponse({ sessions: [] });
		});
		vi.stubGlobal('fetch', fetchMock);
		const client = new SessionClient();

		await client.createSession();
		await client.renameSession(SESSION_KEY, TITLE);
		await client.deleteSession(SESSION_KEY);

		const fullListReads = fetchMock.mock.calls.filter(
			([input, init]) => String(input) === '/api/sessions' && init?.method === undefined
		);
		expect(fullListReads).toHaveLength(0);
	});

	it('does not backfill titles when initializing the sidebar', async () => {
		const fetchMock = vi.fn<typeof fetch>(async () =>
			jsonResponse({
				sessions: [
					{
						key: OTHER_SESSION_KEY,
						title: 'New chat',
						titleStatus: 'ready',
						updatedAt: INITIAL_UPDATED_AT,
						isLegacy: false
					}
				]
			})
		);
		vi.stubGlobal('fetch', fetchMock);
		const client = new SessionClient();

		await client.initSidebar();

		expect(fetchMock.mock.calls.map(([input]) => String(input))).toEqual(['/api/sessions']);
	});
});
