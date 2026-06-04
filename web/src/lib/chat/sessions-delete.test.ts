import { afterEach, describe, expect, it, vi } from 'vitest';

import { SessionClient } from './sessions.svelte.js';

const SESSION_KEY = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440001';

function jsonResponse(body: unknown, init?: ResponseInit): Response {
	return Response.json(body, init);
}

describe('SessionClient optimistic delete', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('removes the session from the sidebar before the delete request finishes', async () => {
		let resolveDelete: (response: Response) => void = () => {};
		const deleteResponse = new Promise<Response>((resolve) => {
			resolveDelete = resolve;
		});
		const fetchMock = vi.fn<typeof fetch>(async (input) => {
			const path = String(input);
			if (path.includes('/api/sessions') && path.endsWith(encodeURIComponent(SESSION_KEY))) {
				return deleteResponse;
			}
			return jsonResponse({ sessions: [] });
		});
		vi.stubGlobal('fetch', fetchMock);

		const client = new SessionClient();
		client.state.sessions = [
			{
				key: SESSION_KEY,
				title: 'Ontario SaaS',
				titleStatus: 'ready',
				updatedAt: 1,
				isLegacy: false
			}
		];

		const deletePromise = client.deleteSession(SESSION_KEY);
		expect(client.state.sessions).toEqual([]);

		resolveDelete(jsonResponse({}));
		expect(await deletePromise).toBe(true);
	});
});
