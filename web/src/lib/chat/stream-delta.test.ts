import { describe, expect, it } from 'vitest';

import { applyStreamDelta } from './stream-delta.js';

describe('applyStreamDelta', () => {
	it('replaces with cumulative snapshots from the BFF', () => {
		expect(applyStreamDelta('Hello', 'Hello world')).toBe('Hello world');
	});

	it('appends incremental chunks when needed', () => {
		expect(applyStreamDelta('Hello', ' world')).toBe('Hello world');
	});

	it('replaces accumulated text when the gateway resets mid-stream', () => {
		expect(applyStreamDelta('Hello', 'Goodbye', true)).toBe('Goodbye');
	});
});
