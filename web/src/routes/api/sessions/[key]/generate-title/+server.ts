import { withApiJsonEvent } from '$lib/server/api-handler.js';
import { ownershipRegistryForEvent } from '$lib/server/auth-context.js';
import { assertOwnedPennySession } from '$lib/server/penny-session-ownership.js';
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
			const registry = ownershipRegistryForEvent(event);
			await assertOwnedPennySession(registry, key);
			const body = await readGenerateTitleBody(request);
			const session = await generatePennySessionTitle(key, body.firstMessage, registry);
			return { session };
			},
			'failed to generate session title',
			{ timingName: 'generate_title' }
		);
}
