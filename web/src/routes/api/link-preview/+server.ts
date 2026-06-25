import { withApiJsonEvent } from '$lib/server/api-handler.js';
import { requireUser } from '$lib/server/auth-context.js';
import { fetchLinkPreview } from '$lib/server/link-preview.js';

export async function GET(event) {
	return withApiJsonEvent(
		event,
		async (requestEvent) => {
			requireUser(requestEvent);
			const rawUrl = requestEvent.url.searchParams.get('url');
			const preview = await fetchLinkPreview(rawUrl ?? '');
			return preview;
		},
		'link preview failed'
	);
}
