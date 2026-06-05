import { buildArtifactDownloadFilename } from '@penny/shared/artifact-download-filename';
import { error } from '@sveltejs/kit';

import { withApiCatch } from '$lib/server/api-handler.js';
import {
	artifactPdfExists,
	getArtifactMeta,
	readArtifactPdfBytes
} from '$lib/server/artifact-storage.js';
import { parseArtifactVersionParam } from '$lib/server/artifact-route.js';
import { resolveSessionKey } from '$lib/server/session-key.js';

export async function GET(event) {
	return withApiCatch(async () => {
		const sessionKey = resolveSessionKey(event.url.searchParams.get('sessionKey'));
		const artifactId = event.params.id?.trim();
		if (!artifactId) {
			throw error(400, 'artifact id required');
		}

		const format = event.url.searchParams.get('format') ?? 'pdf';
		if (format !== 'pdf') {
			throw error(400, 'unsupported download format');
		}

		const meta = await getArtifactMeta(sessionKey, artifactId);
		if (!meta) {
			throw error(404, 'artifact not found');
		}

		const version = parseArtifactVersionParam(
			event.url.searchParams.get('version'),
			meta.latestVersion
		);

		const pdfReady = await artifactPdfExists(sessionKey, artifactId, version);
		if (!pdfReady) {
			throw error(404, 'pdf not available');
		}

		const pdfBytes = await readArtifactPdfBytes(sessionKey, artifactId, version);
		const filename = buildArtifactDownloadFilename(meta.title, version);
		const encodedFilename = encodeURIComponent(filename);

		return new Response(new Uint8Array(pdfBytes), {
			headers: {
				'content-type': 'application/pdf',
				'content-disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`,
				'cache-control': 'no-store'
			}
		});
	}, 'failed to download artifact');
}
