import type { Handle } from '@sveltejs/kit';

import { isBlockedHost } from '$lib/server/host-gate.js';

export const handle: Handle = ({ event, resolve }) => {
	if (isBlockedHost(event.url.host)) {
		return new Response('Not found', { status: 404 });
	}

	return resolve(event);
};
