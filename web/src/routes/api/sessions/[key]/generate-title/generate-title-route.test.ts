import { afterEach, describe, expect, it, vi } from 'vitest';

const { generatePennySessionTitle } = vi.hoisted(() => ({
	generatePennySessionTitle: vi.fn()
}));

vi.mock('$lib/server/session-orchestration.js', () => ({
	generatePennySessionTitle
}));

import { POST } from './+server.js';

const BAD_REQUEST_STATUS = 400;
const SESSION_KEY = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440001';

function buildPostEvent(body: unknown) {
	return {
		params: { key: SESSION_KEY },
		request: new Request('https://penny.local/api/sessions/key/generate-title', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		})
	};
}

describe('generate title route', () => {
	afterEach(() => {
		generatePennySessionTitle.mockReset();
	});

	it('rejects non-object request bodies', async () => {
		const response = await POST(buildPostEvent(null));

		expect(response.status).toBe(BAD_REQUEST_STATUS);
		expect(generatePennySessionTitle).not.toHaveBeenCalled();
	});

	it('rejects non-string firstMessage values', async () => {
		const response = await POST(buildPostEvent({ firstMessage: 123 }));

		expect(response.status).toBe(BAD_REQUEST_STATUS);
		expect(generatePennySessionTitle).not.toHaveBeenCalled();
	});
});
