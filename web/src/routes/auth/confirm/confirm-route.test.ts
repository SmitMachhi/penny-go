import { describe, expect, it, vi } from 'vitest';

import { GET } from './+server.js';

const REDIRECT_STATUS = 303;

type ConfirmEvent = Parameters<typeof GET>[0];

function confirmEvent(search: string, auth: Record<string, unknown>) {
	const event = {
		locals: { supabase: { auth } },
		url: new URL(`https://penny.test/auth/confirm${search}`)
	};
	return event as unknown as ConfirmEvent;
}

describe('auth confirm route', () => {
	it('exchanges an OAuth code for a session', async () => {
		const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });

		await expect(
			GET(confirmEvent('?code=abc123&next=%2F', { exchangeCodeForSession }))
		).rejects.toMatchObject({ location: '/', status: REDIRECT_STATUS });

		expect(exchangeCodeForSession).toHaveBeenCalledWith('abc123');
	});
});
