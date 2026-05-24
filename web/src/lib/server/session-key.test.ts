import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server/gateway-env.js', () => ({
	getGatewayConfig: () => ({ sessionKey: 'agent:main:penny-web' })
}));

import { resolveSessionKey, SessionKeyError } from './session-key.js';

describe('resolveSessionKey', () => {
	it('returns configured session key by default', () => {
		expect(resolveSessionKey(null)).toBe('agent:main:penny-web');
	});

	it('accepts only the configured session key', () => {
		expect(resolveSessionKey('agent:main:penny-web')).toBe('agent:main:penny-web');
	});

	it('rejects foreign session keys', () => {
		expect(() => resolveSessionKey('agent:main:other')).toThrow(SessionKeyError);
	});
});
