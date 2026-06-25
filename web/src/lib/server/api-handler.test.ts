import { describe, expect, it } from 'vitest';

import { AuthRequiredError } from './api-error.js';
import { withApiJson } from './api-handler.js';

describe('withApiJson', () => {
	it('adds a server timing header when a metric name is provided', async () => {
		const response = await withApiJson(
			async () => ({ ok: true }),
			'failed',
			{ timingName: 'sessions' }
		);

		expect(response.headers.get('Server-Timing')).toMatch(/^sessions;dur=\d+(\.\d+)?$/);
	});

	it('preserves server timing headers on error responses', async () => {
		const response = await withApiJson(
			async () => {
				throw new Error('broken');
			},
			'failed',
			{ timingName: 'history' }
		);

		expect(response.status).toBe(503);
		expect(response.headers.get('Server-Timing')).toMatch(/^history;dur=\d+(\.\d+)?$/);
	});

	it('does not expose unexpected exception messages', async () => {
		const response = await withApiJson(async () => {
			throw new Error('database path /app/workspace/private failed');
		}, 'failed safely');
		const body = (await response.json()) as { error: string };

		expect(response.status).toBe(503);
		expect(body.error).toBe('failed safely');
	});

	it('maps missing auth to 401', async () => {
		const response = await withApiJson(async () => {
			throw new AuthRequiredError();
		}, 'failed');

		expect(response.status).toBe(401);
	});
});
