import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

import { isValidChatRouteId } from '$lib/chat/session-routes.js';

export const load: PageLoad = ({ params }) => {
	if (!isValidChatRouteId(params.id)) {
		error(404, 'Chat not found');
	}
};
