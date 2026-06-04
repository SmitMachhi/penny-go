import { error } from '@sveltejs/kit';

import { withApiCatch } from '$lib/server/api-handler.js';
import {
	artifactPdfExists,
	getArtifactDetail,
	getArtifactMeta,
	readArtifactPdfBytes
} from '$lib/server/artifact-storage.js';
import { resolveSessionKey } from '$lib/server/session-key.js';

function parseVersionParam(value: string | null, latestVersion: number): number {
	if (!value) {
		return latestVersion;
	}
	const parsed = Number.parseInt(value, 10);
	if (!Number.isInteger(parsed) || parsed < 1 || parsed > latestVersion) {
		throw error(400, 'invalid artifact version');
	}
	return parsed;
}

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

		const version = parseVersionParam(
			event.url.searchParams.get('version'),
			meta.latestVersion
		);

		if (event.url.searchParams.get('preview') === 'pdf') {
			const pdfReady = await artifactPdfExists(sessionKey, artifactId, version);
			if (!pdfReady) {
				throw error(404, 'pdf not available');
			}

			const pdfBytes = await readArtifactPdfBytes(sessionKey, artifactId, version);
			return new Response(new Uint8Array(pdfBytes), {
				headers: {
					'content-type': 'application/pdf',
					'content-disposition': 'inline',
					'cache-control': 'no-store'
				}
			});
		}

		const detail = await getArtifactDetail(sessionKey, artifactId);
		if (!detail) {
			throw error(404, 'artifact not found');
		}

		return new Response(JSON.stringify(detail), {
			headers: {
				'content-type': 'application/json; charset=utf-8'
			}
		});
	}, 'failed to load artifact');
}
