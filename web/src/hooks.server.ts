import type { Handle } from '@sveltejs/kit';

import { isBlockedHost } from '$lib/server/host-gate.js';
import { createRequestSupabaseClient } from '$lib/server/supabase-server.js';

export const handle: Handle = async ({ event, resolve }) => {
	if (isBlockedHost(event.url.host)) {
		return new Response('Not found', { status: 404 });
	}

	event.locals.supabase = createRequestSupabaseClient(event);

	return resolve(event);
};
