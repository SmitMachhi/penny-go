import { describe, expect, it } from 'vitest';

import { isBlockedHost } from './host-gate.js';

describe('host gate', () => {
	it('blocks the default Fly hostname', () => {
		expect(isBlockedHost('penny-go.fly.dev')).toBe(true);
		expect(isBlockedHost('penny-go.fly.dev:443')).toBe(true);
	});

	it('allows the canonical custom hostname and local development hosts', () => {
		expect(isBlockedHost('penny.tanex.co')).toBe(false);
		expect(isBlockedHost('localhost:5173')).toBe(false);
		expect(isBlockedHost('127.0.0.1:5173')).toBe(false);
	});
});
