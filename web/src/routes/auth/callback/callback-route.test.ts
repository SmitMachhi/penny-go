import { describe, expect, it, vi } from 'vitest';

import { GET } from './+server.js';

const REDIRECT_STATUS = 303;

type CallbackEvent = Parameters<typeof GET>[0];

function callbackEvent(search: string, auth: Record<string, unknown>): CallbackEvent {
	return {
		locals: { supabase: { auth } },
		url: new URL(`https://penny.test/auth/callback${search}`)
	} as unknown as CallbackEvent;
}

describe('auth callback route', () => {
	it('verifies email confirmation links with token hashes', async () => {
		const verifyOtp = vi.fn().mockResolvedValue({ error: null });

		await expect(
			GET(callbackEvent('?token_hash=abc&type=signup&next=%2F', { verifyOtp }))
		).rejects.toMatchObject({ location: '/', status: REDIRECT_STATUS });

		expect(verifyOtp).toHaveBeenCalledWith({
			token_hash: 'abc',
			type: 'signup'
		});
	});
});
