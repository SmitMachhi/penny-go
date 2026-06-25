import { describe, expect, it, vi } from 'vitest';

import { createSupabasePennySessionOwnershipStore } from './supabase-session-ownership-store.js';

const SESSION_KEY = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440001';

describe('supabase session ownership store', () => {
	it('checks ownership by session key', async () => {
		const maybeSingle = vi.fn().mockResolvedValue({ data: { session_key: SESSION_KEY }, error: null });
		const eq = vi.fn().mockReturnValue({ maybeSingle });
		const select = vi.fn().mockReturnValue({ eq });
		const client = { from: vi.fn().mockReturnValue({ select }) };
		const store = createSupabasePennySessionOwnershipStore(client);

		await expect(store.hasSession(SESSION_KEY)).resolves.toBe(true);
		expect(client.from).toHaveBeenCalledWith('penny_sessions');
		expect(select).toHaveBeenCalledWith('session_key');
		expect(eq).toHaveBeenCalledWith('session_key', SESSION_KEY);
	});

	it('creates an ownership row for a penny session', async () => {
		const insert = vi.fn().mockResolvedValue({ error: null });
		const client = { from: vi.fn().mockReturnValue({ insert }) };
		const store = createSupabasePennySessionOwnershipStore(client);

		await store.createSession({
			key: SESSION_KEY,
			title: 'Ontario SaaS',
			titleStatus: 'ready',
			updatedAt: 1_000,
			isLegacy: false
		});

		expect(insert).toHaveBeenCalledWith({
			session_key: SESSION_KEY,
			session_uuid: '550e8400-e29b-41d4-a716-446655440001',
			title: 'Ontario SaaS',
			updated_at: '1970-01-01T00:00:01.000Z'
		});
	});
});
