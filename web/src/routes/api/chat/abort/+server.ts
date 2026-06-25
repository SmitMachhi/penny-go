import { withApiJson } from '$lib/server/api-handler.js';
import { ownershipRegistryForEvent } from '$lib/server/auth-context.js';
import { abortChat } from '$lib/server/chat-orchestration.js';
import { assertOwnedPennySession } from '$lib/server/penny-session-ownership.js';

export async function POST(event) {
	return withApiJson(async () => {
		const { request } = event;
		const body = (await request.json()) as { sessionKey?: string; runId?: string };
		await assertOwnedPennySession(ownershipRegistryForEvent(event), body.sessionKey);
		return abortChat(body);
	}, 'failed to abort chat run');
}
