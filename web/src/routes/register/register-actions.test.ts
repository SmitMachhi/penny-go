import { describe, expect, it, vi } from 'vitest';

import { actions } from './+page.server.js';

const NEXT_PATH = '/c/550e8400-e29b-41d4-a716-446655440001';

type RegisterActionEvent = Parameters<NonNullable<typeof actions.default>>[0];

function actionEvent(auth: Record<string, unknown>): RegisterActionEvent {
	const event = {
		locals: { supabase: { auth }, user: null },
		request: {
			formData: async () => {
				const form = new FormData();
				form.set('email', 'USER@Example.com');
				form.set('password', 'password123');
				form.set('next', NEXT_PATH);
				return form;
			}
		},
		url: new URL('https://penny.test/register')
	};
	return event as unknown as RegisterActionEvent;
}

describe('register actions', () => {
	it('creates an email password account and asks for confirmation', async () => {
		const signUp = vi.fn().mockResolvedValue({ data: { session: null }, error: null });

		await expect(actions.default(actionEvent({ signUp }))).resolves.toMatchObject({
			email: 'user@example.com',
			next: NEXT_PATH,
			sent: true
		});

		expect(signUp).toHaveBeenCalledWith({
			email: 'user@example.com',
			password: 'password123',
			options: {
				emailRedirectTo:
					'https://penny.test/auth/callback?next=%2Fc%2F550e8400-e29b-41d4-a716-446655440001'
			}
		});
	});
});
