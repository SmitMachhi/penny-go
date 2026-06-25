import { fail, redirect } from '@sveltejs/kit';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_NEXT_PATH = '/';

function safeNextPath(candidate: string | null): string {
	if (!candidate?.startsWith('/')) {
		return DEFAULT_NEXT_PATH;
	}
	if (candidate.startsWith('//')) {
		return DEFAULT_NEXT_PATH;
	}
	return candidate;
}

export const load = ({ locals, url }) => {
	if (locals.user) {
		redirect(303, safeNextPath(url.searchParams.get('next')));
	}
	return {
		next: safeNextPath(url.searchParams.get('next'))
	};
};

export const actions = {
	default: async (event) => {
		const form = await event.request.formData();
		const email = String(form.get('email') ?? '').trim().toLowerCase();
		const next = safeNextPath(String(form.get('next') ?? DEFAULT_NEXT_PATH));
		if (!EMAIL_PATTERN.test(email)) {
			return fail(400, { email, error: 'Enter a valid email address.', next });
		}

		const redirectTo = new URL('/auth/confirm', event.url.origin);
		redirectTo.searchParams.set('next', next);
		const { error } = await event.locals.supabase.auth.signInWithOtp({
			email,
			options: { emailRedirectTo: redirectTo.toString() }
		});
		if (error) {
			return fail(400, { email, error: error.message, next });
		}

		return { email, next, sent: true };
	}
};
