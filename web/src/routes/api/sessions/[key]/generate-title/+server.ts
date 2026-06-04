import { withApiJsonEvent } from '$lib/server/api-handler.js';
import { generatePennySessionTitle } from '$lib/server/session-orchestration.js';

import { readGenerateTitleBody } from './generate-title-body.js';

export async function POST(event) {
	return withApiJsonEvent(
		event,
		async ({ params, request }) => {
			const key = params.key;
			if (!key) {
				throw new Error('session key is required');
			}
			const body = await readGenerateTitleBody(request);
			const session = await generatePennySessionTitle(key, body.firstMessage);
			return { session };
			},
			'failed to generate session title',
			{ timingName: 'generate_title' }
		);
}
