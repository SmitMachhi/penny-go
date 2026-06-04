import { withApiJson } from '$lib/server/api-handler.js';
import { readPennySessionIndex } from '$lib/server/penny-session-index.js';

export async function GET() {
	return withApiJson(
		async () => ({ sessions: await readPennySessionIndex() }),
		'failed to load session index',
		{ timingName: 'sessions_index' }
	);
}
