import { describe, expect, it, vi } from 'vitest';

import {
	assertOwnedPennySession,
	SessionOwnershipError,
	type PennySessionOwnershipStore
} from './penny-session-ownership.js';
import { LEGACY_SESSION_KEY } from './session-key.js';

const SESSION_KEY = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440001';

describe('penny session ownership', () => {
	it('rejects legacy sessions because they have no user owner', async () => {
		const store: PennySessionOwnershipStore = {
			hasSession: vi.fn()
		};

		await expect(assertOwnedPennySession(store, LEGACY_SESSION_KEY)).rejects.toThrow(
			SessionOwnershipError
		);
		expect(store.hasSession).not.toHaveBeenCalled();
	});

	it('returns a valid penny session key when the user owns it', async () => {
		const store: PennySessionOwnershipStore = {
			hasSession: vi.fn().mockResolvedValue(true)
		};

		await expect(assertOwnedPennySession(store, SESSION_KEY)).resolves.toBe(SESSION_KEY);
		expect(store.hasSession).toHaveBeenCalledWith(SESSION_KEY);
	});

	it('rejects a valid penny session key when the user does not own it', async () => {
		const store: PennySessionOwnershipStore = {
			hasSession: vi.fn().mockResolvedValue(false)
		};

		await expect(assertOwnedPennySession(store, SESSION_KEY)).rejects.toThrow(
			SessionOwnershipError
		);
	});
});
