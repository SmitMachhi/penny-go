import { describe, expect, it, vi } from 'vitest';

import {
	createSupabasePennySessionOwnershipStore,
	type PennySessionsTableClient
} from './supabase-session-ownership-store.js';

const SESSION_KEY = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440001';
const SESSION_UUID = '550e8400-e29b-41d4-a716-446655440001';
const UPDATED_AT = 1_719_999_999_000;

function unusedTableMethods() {
	const mutationOk = { error: null };
	const queryEmpty = { data: null, error: null };
	return {
		delete: () => ({ eq: vi.fn().mockResolvedValue(mutationOk) }),
		select: () => ({
			eq: () => ({ maybeSingle: vi.fn().mockResolvedValue(queryEmpty) }),
			order: vi.fn().mockResolvedValue({ data: [], error: null })
		}),
		update: () => ({ eq: vi.fn().mockResolvedValue(mutationOk) })
	};
}

describe('supabase session ownership store', () => {
	it('records created sessions in penny_sessions', async () => {
		const insert = vi.fn().mockResolvedValue({ error: null });
		const client: PennySessionsTableClient = {
			from: () => ({ ...unusedTableMethods(), insert })
		};
		const store = createSupabasePennySessionOwnershipStore(client);

		await store.createSession({
			key: SESSION_KEY,
			title: 'New chat',
			titleStatus: 'ready',
			updatedAt: UPDATED_AT,
			isLegacy: false
		});

		expect(insert).toHaveBeenCalledWith({
			session_key: SESSION_KEY,
			session_uuid: SESSION_UUID,
			title: 'New chat',
			updated_at: new Date(UPDATED_AT).toISOString()
		});
	});

	it('lists owned sessions from penny_sessions', async () => {
		const order = vi.fn().mockResolvedValue({
			data: [{ session_key: SESSION_KEY, title: 'Private chat', updated_at: '2026-06-25T12:00:00.000Z' }],
			error: null
		});
		const client: PennySessionsTableClient = {
			from: () => ({
				delete: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }),
				insert: vi.fn().mockResolvedValue({ error: null }),
				select: () => ({
					eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }),
					order
				}),
				update: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) })
			})
		};
		const store = createSupabasePennySessionOwnershipStore(client);

		await expect(store.listSessions()).resolves.toEqual([
			{
				key: SESSION_KEY,
				title: 'Private chat',
				titleStatus: 'ready',
				updatedAt: Date.parse('2026-06-25T12:00:00.000Z'),
				isLegacy: false
			}
		]);
	});
});
