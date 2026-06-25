import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const BAD_REQUEST_STATUS = 400;
const DEFAULT_NEXT_PATH = '/';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const REDIRECT_STATUS = 303;

type RegisterFailure = {
	email: string;
	error: string;
	next: string;
};

function safeNextPath(candidate: string | null): string {
	if (!candidate?.startsWith('/') || candidate.startsWith('//')) {
		return DEFAULT_NEXT_PATH;
	}
	return candidate;
}

function callbackUrl(origin: string, next: string): string {
	const url = new URL('/auth/callback', origin);
	url.searchParams.set('next', next);
	return url.toString();
}

function invalidRegister(email: string, next: string, error: string) {
	return fail(BAD_REQUEST_STATUS, { email, error, next } satisfies RegisterFailure);
}

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.user) {
		redirect(REDIRECT_STATUS, safeNextPath(url.searchParams.get('next')));
	}
	return {
		next: safeNextPath(url.searchParams.get('next'))
	};
};

export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData();
		const email = String(form.get('email') ?? '').trim().toLowerCase();
		const password = String(form.get('password') ?? '');
		const next = safeNextPath(String(form.get('next') ?? DEFAULT_NEXT_PATH));
		if (!EMAIL_PATTERN.test(email)) {
			return invalidRegister(email, next, 'Enter a valid email address.');
		}
		if (password.length < MIN_PASSWORD_LENGTH) {
			return invalidRegister(email, next, `Use at least ${MIN_PASSWORD_LENGTH} characters.`);
		}
		const { data, error } = await event.locals.supabase.auth.signUp({
			email,
			password,
			options: { emailRedirectTo: callbackUrl(event.url.origin, next) }
		});
		if (error) {
			return invalidRegister(email, next, error.message);
		}
		if (data.session) {
			redirect(REDIRECT_STATUS, next);
		}
		return { email, next, sent: true };
	}
};
