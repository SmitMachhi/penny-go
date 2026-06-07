import { error } from '@sveltejs/kit';

const DECIMAL_RADIX = 10;
const FIRST_ARTIFACT_VERSION = 1;

export function parseArtifactVersionParam(value: string | null, latestVersion: number): number {
	if (!value) {
		return latestVersion;
	}
	const parsed = Number.parseInt(value, DECIMAL_RADIX);
	if (
		!Number.isInteger(parsed) ||
		parsed < FIRST_ARTIFACT_VERSION ||
		parsed > latestVersion
	) {
		throw error(400, 'invalid artifact version');
	}
	return parsed;
}
