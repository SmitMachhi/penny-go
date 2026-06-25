import { withApiJson } from '$lib/server/api-handler.js';
import { getPennySessionIndex } from '$lib/server/session-orchestration.js';

export async function GET() {
	return withApiJson(
		async () => ({ sessions: await getPennySessionIndex() }),
		'failed to load session index',
		{ timingName: 'sessions_index' }
	);
}
