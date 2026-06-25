// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { SupabaseClient, User } from '@supabase/supabase-js';

import type { Database } from '$lib/server/supabase-types.js';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			supabase: SupabaseClient<Database>;
			user: User | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
