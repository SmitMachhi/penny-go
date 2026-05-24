import { describe, expect, it } from 'vitest';

import type { SsePayload } from './stream-events.js';

/** Mirrors ChatClient delta handling for cumulative vs incremental SSE chunks. */
function applyStreamDelta(current: string, chunk: string): string {
	if (chunk.startsWith(current)) {
		return chunk;
	}
	return current + chunk;
}

describe('applyStreamDelta', () => {
	it('replaces with cumulative snapshots from the BFF', () => {
		expect(applyStreamDelta('Hello', 'Hello world')).toBe('Hello world');
	});

	it('appends incremental chunks when needed', () => {
		expect(applyStreamDelta('Hello', ' world')).toBe('Hello world');
	});
});

export type { SsePayload };
