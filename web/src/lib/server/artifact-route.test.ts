import { describe, expect, it } from 'vitest';
import { isHttpError } from '@sveltejs/kit';

import { parseArtifactVersionParam } from './artifact-route.js';

describe('artifact route helpers', () => {
	it('defaults missing version to the latest version', () => {
		expect(parseArtifactVersionParam(null, 3)).toBe(3);
	});

	it('rejects versions outside the artifact range', () => {
		try {
			parseArtifactVersionParam('4', 3);
			throw new Error('expected version parse failure');
		} catch (error) {
			expect(isHttpError(error)).toBe(true);
			if (isHttpError(error)) {
				expect(error.status).toBe(400);
			}
		}
	});
});
