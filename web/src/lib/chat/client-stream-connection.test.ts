import { afterEach, describe, expect, it, vi } from 'vitest';

import { createChatStreamConnection } from './client-stream-connection.js';

class MockEventSource {
	static instances: MockEventSource[] = [];
	readonly url: string;
	onerror: (() => void) | null = null;
	onmessage: ((event: MessageEvent<string>) => void) | null = null;
	readyState = 1;

	constructor(url: string) {
		this.url = url;
		MockEventSource.instances.push(this);
	}

	close(): void {
		this.readyState = 2;
	}

	emit(payload: unknown): void {
		this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(payload) }));
	}

	triggerError(): void {
		this.onerror?.();
	}
}

describe('createChatStreamConnection', () => {
	afterEach(() => {
		MockEventSource.instances = [];
		vi.unstubAllGlobals();
		vi.useRealTimers();
	});

	it('reconnects after the stream errors', async () => {
		vi.useFakeTimers();
		vi.stubGlobal('EventSource', MockEventSource);

		const payloads: string[] = [];
		const connection = createChatStreamConnection('agent:main:penny:test', {
			onPayload: (payload) => {
				if (payload.type === 'connected') {
					payloads.push('connected');
				}
			}
		});

		expect(MockEventSource.instances).toHaveLength(1);
		MockEventSource.instances[0]?.triggerError();

		await vi.advanceTimersByTimeAsync(1_000);

		expect(MockEventSource.instances).toHaveLength(2);
		connection.close();
	});

	it('ensureOpen creates a fresh connection when the stream is closed', () => {
		vi.stubGlobal('EventSource', MockEventSource);

		const connection = createChatStreamConnection('agent:main:penny:test', {
			onPayload: () => {}
		});

		MockEventSource.instances[0]?.close();
		connection.ensureOpen();

		expect(MockEventSource.instances).toHaveLength(2);
		connection.close();
	});
});
