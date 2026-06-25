import { createServerClient } from '@supabase/ssr';
import type { RequestEvent } from '@sveltejs/kit';

import { env } from '$env/dynamic/public';

const COOKIE_PATH = '/';

export function createRequestSupabaseClient(event: RequestEvent) {
	return createServerClient(env.PUBLIC_SUPABASE_URL ?? '', env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '', {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookiesToSet) => {
				cookiesToSet.forEach(({ name, value, options }) => {
					event.cookies.set(name, value, { ...options, path: COOKIE_PATH });
				});
			}
		}
	});
}
