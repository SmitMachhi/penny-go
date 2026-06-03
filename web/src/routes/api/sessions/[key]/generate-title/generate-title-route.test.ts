import { describe, expect, it } from 'vitest';

import { ValidationError } from '$lib/server/api-error.js';

import { readGenerateTitleBody } from './generate-title-body.js';

function buildRequest(body: unknown): Request {
	return new Request('https://penny.local/api/sessions/key/generate-title', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

describe('generate title route', () => {
	it('rejects non-object request bodies', async () => {
		await expect(readGenerateTitleBody(buildRequest(null))).rejects.toThrow(ValidationError);
	});

	it('rejects non-string firstMessage values', async () => {
		await expect(readGenerateTitleBody(buildRequest({ firstMessage: 123 }))).rejects.toThrow(
			ValidationError
		);
	});
});
