import { describe, expect, it, vi } from 'vitest';

import { actions } from './+page.server.js';

const NEXT_PATH = '/c/550e8400-e29b-41d4-a716-446655440001';
const REDIRECT_STATUS = 303;

type LoginActionEvent = Parameters<NonNullable<typeof actions.email>>[0];

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
});
