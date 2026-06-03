import { withApiJsonEvent } from '$lib/server/api-handler.js';
import { fetchLinkPreview } from '$lib/server/link-preview.js';

export async function GET(event) {
	return withApiJsonEvent(
		event,
		async (requestEvent) => {
			const rawUrl = requestEvent.url.searchParams.get('url');
			const preview = await fetchLinkPreview(rawUrl ?? '');
			return preview;
		},
		'link preview failed'
	);
}
