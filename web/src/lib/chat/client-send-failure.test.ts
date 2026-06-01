import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChatClient } from './client.svelte.js';

const MESSAGE = 'hello penny';
const RUN_ID = 'run-1';
const SESSION_KEY = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440000';
const OTHER_SESSION_KEY = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440001';

class MockEventSource {
	static instances: MockEventSource[] = [];
	onerror: (() => void) | null = null;
	onmessage: ((event: MessageEvent<string>) => void) | null = null;

	constructor(readonly url: string) {
		MockEventSource.instances.push(this);
	}

	close(): void {}

	emit(payload: unknown): void {
		this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(payload) }));
	}
}

describe('ChatClient send failures', () => {
	afterEach(() => {
		MockEventSource.instances = [];
		vi.unstubAllGlobals();
	});

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
		expect(client.state.operationError).toBe('gateway unavailable');
	});

	it('ignores final messages from a run after the session changes', async () => {
		let resolveFinalArtifactLoad: (response: Response) => void = () => {};
		let sessionArtifactLoads = 0;
		const finalArtifactLoad = new Promise<Response>((resolve) => {
			resolveFinalArtifactLoad = resolve;
		});
		vi.stubGlobal('EventSource', MockEventSource);
		vi.stubGlobal(
			'fetch',
			vi.fn<typeof fetch>(async (input) => {
				const path = String(input);
				if (path === '/api/chat/send') {
					return Response.json({ runId: RUN_ID, sessionKey: SESSION_KEY });
				}
				if (path === '/api/chat/abort') {
					return Response.json({});
				}
				if (path.startsWith('/api/chat/history')) {
					return Response.json({ messages: [], sessionKey: path.includes(OTHER_SESSION_KEY) ? OTHER_SESSION_KEY : SESSION_KEY });
				}
				if (path.includes(`/api/artifacts?sessionKey=${encodeURIComponent(SESSION_KEY)}`)) {
					sessionArtifactLoads += 1;
					return sessionArtifactLoads === 1 ? Response.json({ artifacts: [] }) : finalArtifactLoad;
				}
				return Response.json({ artifacts: [] });
			})
		);

		const client = new ChatClient();
		await client.switchSession(SESSION_KEY);
		await client.sendMessage(MESSAGE, { skipHistoryReload: true });
		MockEventSource.instances[0]?.emit({ runId: RUN_ID, text: 'stale final', type: 'chat.final' });
		await client.switchSession(OTHER_SESSION_KEY);
		resolveFinalArtifactLoad(Response.json({ artifacts: [] }));
		await new Promise((resolve) => {
			setTimeout(resolve, 0);
		});

		expect(client.state.sessionKey).toBe(OTHER_SESSION_KEY);
		expect(client.state.messages).toEqual([]);
	});

	it('accepts final stream events that arrive before send returns', async () => {
		let resolveSend: (response: Response) => void = () => {};
		const sendResponse = new Promise<Response>((resolve) => {
			resolveSend = resolve;
		});
		vi.stubGlobal('EventSource', MockEventSource);
		vi.stubGlobal(
			'fetch',
			vi.fn<typeof fetch>(async (input) => {
				const path = String(input);
				if (path === '/api/chat/send') {
					return sendResponse;
				}
				if (path.startsWith('/api/chat/history')) {
					return Response.json({ messages: [], sessionKey: SESSION_KEY });
				}
				return Response.json({ artifacts: [] });
			})
		);

		const client = new ChatClient();
		await client.switchSession(SESSION_KEY);
		const sendPromise = client.sendMessage(MESSAGE, { skipHistoryReload: true });
		MockEventSource.instances[0]?.emit({ runId: RUN_ID, text: 'fast final', type: 'chat.final' });
		resolveSend(Response.json({ runId: RUN_ID, sessionKey: SESSION_KEY }));
		await sendPromise;
		await new Promise((resolve) => {
			setTimeout(resolve, 0);
		});

		expect(client.state.sending).toBe(false);
		expect(client.state.messages.at(-1)).toMatchObject({ role: 'assistant', text: 'fast final' });
	});
});
