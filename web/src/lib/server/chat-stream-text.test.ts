import { describe, expect, it, beforeEach } from 'vitest';

import {
	clearStreamingText,
	resetStreamingTextForTests,
	resolveStreamingText
} from './chat-stream-text.js';

describe('resolveStreamingText', () => {
	beforeEach(() => {
		resetStreamingTextForTests();
	});

	it('prefers cumulative message text from the gateway', () => {
		const text = resolveStreamingText({
			runId: 'run-1',
			state: 'delta',
			deltaText: 'world',
			message: {
				role: 'assistant',
				content: [{ type: 'text', text: 'Hello world' }]
			}
		});

		expect(text).toBe('Hello world');
	});

	it('appends incremental deltaText chunks', () => {
		expect(
			resolveStreamingText({
				runId: 'run-1',
				state: 'delta',
				deltaText: 'Hello'
			})
		).toBe('Hello');

		expect(
			resolveStreamingText({
				runId: 'run-1',
				state: 'delta',
				deltaText: ' world'
			})
		).toBe('Hello world');
	});

	it('replaces buffered text when the gateway sets replace', () => {
		resolveStreamingText({
			runId: 'run-1',
			state: 'delta',
			deltaText: 'Hello'
		});

		expect(
			resolveStreamingText({
				runId: 'run-1',
				state: 'delta',
				deltaText: 'Goodbye',
				replace: true
			})
		).toBe('Goodbye');
	});

	it('clears run state explicitly', () => {
		resolveStreamingText({ runId: 'run-1', state: 'delta', deltaText: 'Hi' });
		clearStreamingText('run-1');
		expect(resolveStreamingText({ runId: 'run-1', state: 'delta', deltaText: '!' })).toBe('!');
	});
});
