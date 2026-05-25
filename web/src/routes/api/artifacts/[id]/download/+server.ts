import { error } from '@sveltejs/kit';

import { withApiCatch } from '$lib/server/api-handler.js';
import {
	artifactPdfExists,
	getArtifactMeta,
	readArtifactPdfBytes
} from '$lib/server/artifact-storage.js';
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

		const pdfReady = await artifactPdfExists(sessionKey, artifactId);
		if (!pdfReady) {
			throw error(404, 'pdf not available');
		}

		const pdfBytes = await readArtifactPdfBytes(sessionKey, artifactId);
		const filename = `${sanitizeFilename(meta.title)}.pdf`;

		return new Response(new Uint8Array(pdfBytes), {
			headers: {
				'content-type': 'application/pdf',
				'content-disposition': `attachment; filename="${filename}"`,
				'cache-control': 'no-store'
			}
		});
	}, 'failed to download artifact');
}

function sanitizeFilename(title: string): string {
	const cleaned = title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase();
	return cleaned.length > 0 ? cleaned : 'penny-funding-brief';
}
