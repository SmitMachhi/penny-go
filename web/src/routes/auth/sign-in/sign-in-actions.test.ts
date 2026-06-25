import { describe, expect, it, vi } from 'vitest';

import { actions } from './+page.server.js';

const NEXT_PATH = '/c/550e8400-e29b-41d4-a716-446655440001';
const REDIRECT_STATUS = 303;

type ActionEvent = Parameters<NonNullable<typeof actions.signIn>>[0];

function formEvent(values: Record<string, string>, auth: Record<string, unknown>) {
	const event = {
		locals: { supabase: { auth }, user: null },
		request: {
			formData: async () => {
				const form = new FormData();
				Object.entries(values).forEach(([key, value]) => form.set(key, value));
				return form;
			}
		},
		url: new URL('https://penny.test/auth/sign-in')
	};
	return event as unknown as ActionEvent;
}

describe('sign-in actions', () => {
	it('signs in with email and password', async () => {
		const signInWithPassword = vi.fn().mockResolvedValue({ error: null });

		await expect(
			actions.signIn(
				formEvent(
					{ email: 'USER@Example.com', password: 'password123', next: NEXT_PATH },
					{ signInWithPassword }
				)
			)
		).rejects.toMatchObject({ location: NEXT_PATH, status: REDIRECT_STATUS });

		expect(signInWithPassword).toHaveBeenCalledWith({
			email: 'user@example.com',
			password: 'password123'
		});
	});

	it('starts email registration and asks for the verification code', async () => {
		const signUp = vi.fn().mockResolvedValue({ data: { session: null }, error: null });

		await expect(
			actions.signUp(
				formEvent(
					{ email: 'user@example.com', password: 'password123', next: NEXT_PATH },
					{ signUp }
				)
			)
		).resolves.toMatchObject({
			email: 'user@example.com',
			mode: 'verify',
			next: NEXT_PATH
		});

		expect(signUp).toHaveBeenCalledWith({
			email: 'user@example.com',
			password: 'password123',
			options: {
				emailRedirectTo:
					'https://penny.test/auth/confirm?next=%2Fc%2F550e8400-e29b-41d4-a716-446655440001'
			}
		});
	});

	it('verifies an email registration code', async () => {
		const verifyOtp = vi.fn().mockResolvedValue({ error: null });

		await expect(
			actions.verifyCode(
				formEvent(
					{ email: 'user@example.com', token: '123456', next: NEXT_PATH },
					{ verifyOtp }
				)
			)
		).rejects.toMatchObject({ location: NEXT_PATH, status: REDIRECT_STATUS });

		expect(verifyOtp).toHaveBeenCalledWith({
			email: 'user@example.com',
			token: '123456',
			type: 'email'
		});
	});

	it('redirects to Google OAuth', async () => {
		const signInWithOAuth = vi.fn().mockResolvedValue({
			data: { url: 'https://accounts.google.com/o/oauth2/v2/auth' },
			error: null
		});

		await expect(
			actions.google(formEvent({ next: NEXT_PATH }, { signInWithOAuth }))
		).rejects.toMatchObject({
			location: 'https://accounts.google.com/o/oauth2/v2/auth',
			status: REDIRECT_STATUS
		});

		expect(signInWithOAuth).toHaveBeenCalledWith({
			provider: 'google',
			options: { redirectTo: 'https://penny.test/auth/confirm?next=%2Fc%2F550e8400-e29b-41d4-a716-446655440001' }
		});
	});
});
