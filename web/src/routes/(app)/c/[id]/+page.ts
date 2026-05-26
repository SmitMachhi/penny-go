import { error } from '@sveltejs/kit';

import { isValidChatRouteId } from '$lib/chat/session-routes.js';

export function load({ params }) {
	if (!isValidChatRouteId(params.id)) {
		error(404, 'Chat not found');
	}
}
