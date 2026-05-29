import { describe, expect, it, vi } from 'vitest';

import { ChatClient } from './client.svelte.js';

const MESSAGE = 'hello penny';
const SESSION_KEY = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440000';

describe('ChatClient send failures', () => {
	it('removes the optimistic user message when sending fails', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn<typeof fetch>(async () =>
				Response.json({ error: 'gateway unavailable' }, { status: 503 })
			)
		);

		const client = new ChatClient();
		client.state.sessionKey = SESSION_KEY;

		const sent = await client.sendMessage(MESSAGE, { skipHistoryReload: true });

		expect(sent).toBe(false);
		expect(client.state.messages).toEqual([]);
		expect(client.state.error).toBe('gateway unavailable');
		vi.unstubAllGlobals();
	});
});
