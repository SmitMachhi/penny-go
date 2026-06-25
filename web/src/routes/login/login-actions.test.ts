import { describe, expect, it, vi } from 'vitest';

import { actions } from './+page.server.js';

const NEXT_PATH = '/c/550e8400-e29b-41d4-a716-446655440001';
const REDIRECT_STATUS = 303;

type LoginActionEvent = Parameters<NonNullable<typeof actions.google>>[0];

function actionEvent(
	auth: Record<string, unknown>,
	values: Record<string, string> = {}
): LoginActionEvent {
	const event = {
		locals: { supabase: { auth }, user: null },
		request: {
			formData: async () => {
				const form = new FormData();
				form.set('next', NEXT_PATH);
				Object.entries(values).forEach(([key, value]) => form.set(key, value));
				return form;
			}
		},
		url: new URL('https://penny.test/login')
	};
	return event as unknown as LoginActionEvent;
}

describe('login actions', () => {
	it('signs in with email and password without sending email', async () => {
		const signInWithPassword = vi.fn().mockResolvedValue({ error: null });

		await expect(
			actions.email(
				actionEvent({ signInWithPassword }, {
					email: 'USER@Example.com',
					password: 'password123'
				})
			)
		).rejects.toMatchObject({ location: NEXT_PATH, status: REDIRECT_STATUS });

		expect(signInWithPassword).toHaveBeenCalledWith({
			email: 'user@example.com',
			password: 'password123'
		});
	});

	it('redirects to Google OAuth', async () => {
		const signInWithOAuth = vi.fn().mockResolvedValue({
			data: { url: 'https://accounts.google.com/oauth' },
			error: null
		});

		await expect(actions.google(actionEvent({ signInWithOAuth }))).rejects.toMatchObject({
			location: 'https://accounts.google.com/oauth',
			status: REDIRECT_STATUS
		});

		expect(signInWithOAuth).toHaveBeenCalledWith({
			provider: 'google',
			options: {
				redirectTo: 'https://penny.test/auth/callback?next=%2Fc%2F550e8400-e29b-41d4-a716-446655440001'
			}
		});
	});

	it('redirects to Microsoft OAuth through Azure', async () => {
		const signInWithOAuth = vi.fn().mockResolvedValue({
			data: { url: 'https://login.microsoftonline.com/oauth' },
			error: null
		});

		await expect(actions.microsoft(actionEvent({ signInWithOAuth }))).rejects.toMatchObject({
			location: 'https://login.microsoftonline.com/oauth',
			status: REDIRECT_STATUS
		});

		expect(signInWithOAuth).toHaveBeenCalledWith({
			provider: 'azure',
			options: {
				redirectTo: 'https://penny.test/auth/callback?next=%2Fc%2F550e8400-e29b-41d4-a716-446655440001'
			}
		});
	});
});
