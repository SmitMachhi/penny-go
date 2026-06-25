import { describe, expect, it } from 'vitest';

import { AuthRequiredError } from './api-error.js';
import { requireUser } from './auth-context.js';

describe('auth context', () => {
	it('returns the authenticated user from locals', () => {
		const user = { id: '550e8400-e29b-41d4-a716-446655440001' };

		expect(requireUser({ locals: { user } })).toBe(user);
	});

	it('rejects a request without an authenticated user', () => {
		expect(() => requireUser({ locals: { user: null } })).toThrow(AuthRequiredError);
	});
});
