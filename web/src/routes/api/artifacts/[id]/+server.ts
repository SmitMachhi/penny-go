import { error } from '@sveltejs/kit';

import { withApiCatch } from '$lib/server/api-handler.js';
import {
	getArtifactMeta,
	readArtifactSlidesHtml
} from '$lib/server/artifact-storage.js';
import { resolveSessionKey } from '$lib/server/session-key.js';

export async function GET(event) {
	return withApiCatch(async () => {
		const sessionKey = resolveSessionKey(event.url.searchParams.get('sessionKey'));
		const artifactId = event.params.id?.trim();
		if (!artifactId) {
			throw error(400, 'artifact id required');
		}

		const accept = event.request.headers.get('accept') ?? '';
		const wantsHtml =
			event.url.searchParams.get('preview') === 'html' ||
			(accept.includes('text/html') && !accept.includes('application/json'));

		if (wantsHtml) {
			const html = await readArtifactSlidesHtml(sessionKey, artifactId);
			return new Response(html, {
				headers: {
					'content-type': 'text/html; charset=utf-8',
					'cache-control': 'no-store'
				}
			});
		}

		const meta = await getArtifactMeta(sessionKey, artifactId);
		if (!meta) {
			throw error(404, 'artifact not found');
		}

		return new Response(JSON.stringify({ sessionKey, artifact: meta }), {
			headers: {
				'content-type': 'application/json; charset=utf-8'
			}
		});
	}, 'failed to load artifact');
}
