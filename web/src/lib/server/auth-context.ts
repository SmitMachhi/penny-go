import type { RequestEvent } from '@sveltejs/kit';
import type { User } from '@supabase/supabase-js';

import { AuthRequiredError } from '$lib/server/api-error.js';
import type { PennySessionOwnershipRegistry } from '$lib/server/penny-session-ownership.js';
import {
	createSupabasePennySessionOwnershipStore,
	type PennySessionsTableClient
} from '$lib/server/supabase-session-ownership-store.js';

type RequestUser = Pick<User, 'id'>;

type AuthLocals = {
	locals: {
		user: RequestUser | null;
	};
};

export function requireUser(event: AuthLocals): RequestUser {
	if (!event.locals.user) {
		throw new AuthRequiredError();
	}
	return event.locals.user;
}

function ownershipTableClient(event: RequestEvent): PennySessionsTableClient {
	return {
		from: (table) => ({
			delete: () => ({
				eq: async (column, value) => {
					const { error } = await event.locals.supabase.from(table).delete().eq(column, value);
					return { error };
				}
			}),
			insert: async (row) => {
				const { error } = await event.locals.supabase.from(table).insert(row);
				return { error };
			},
			select: (columns) => ({
				eq: (column, value) => ({
					maybeSingle: () =>
						event.locals.supabase.from(table).select(columns).eq(column, value).maybeSingle()
				}),
				order: (column, options) =>
					event.locals.supabase.from(table).select(columns).order(column, options)
			}),
			update: (row) => ({
				eq: async (column, value) => {
					const { error } = await event.locals.supabase.from(table).update(row).eq(column, value);
					return { error };
				}
			})
		})
	};
}

export function ownershipRegistryForEvent(event: RequestEvent): PennySessionOwnershipRegistry {
	requireUser(event);
	return createSupabasePennySessionOwnershipStore(ownershipTableClient(event));
}
