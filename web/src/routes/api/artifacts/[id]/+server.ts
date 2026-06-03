import { error } from '@sveltejs/kit';

import { withApiCatch } from '$lib/server/api-handler.js';
import {
	artifactPdfExists,
	getArtifactMeta,
	readArtifactPdfBytes,
	toArtifactSummary
} from '$lib/server/artifact-storage.js';
import { resolveSessionKey } from '$lib/server/session-key.js';

export async function GET(event) {
	return withApiCatch(async () => {
		const sessionKey = resolveSessionKey(event.url.searchParams.get('sessionKey'));
		const artifactId = event.params.id?.trim();
		if (!artifactId) {
			throw error(400, 'artifact id required');
		}

		const meta = await getArtifactMeta(sessionKey, artifactId);
		if (!meta) {
			throw error(404, 'artifact not found');
		}

		if (event.url.searchParams.get('preview') === 'pdf') {
			const pdfReady = await artifactPdfExists(sessionKey, artifactId);
			if (!pdfReady) {
				throw error(404, 'pdf not available');
			}

			const pdfBytes = await readArtifactPdfBytes(sessionKey, artifactId);
			return new Response(new Uint8Array(pdfBytes), {
				headers: {
					'content-type': 'application/pdf',
					'cache-control': 'no-store'
				}
			});
		}

		return new Response(JSON.stringify({ artifact: toArtifactSummary(meta) }), {
			headers: {
				'content-type': 'application/json; charset=utf-8'
			}
		});
	}, 'failed to load artifact');
}
