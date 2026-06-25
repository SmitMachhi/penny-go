import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const BAD_REQUEST_STATUS = 400;
const DEFAULT_NEXT_PATH = '/';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const REDIRECT_STATUS = 303;

type LoginFailure = {
	email?: string;
	error: string;
	next: string;
};

function safeNextPath(candidate: string | null): string {
	if (!candidate?.startsWith('/') || candidate.startsWith('//')) {
		return DEFAULT_NEXT_PATH;
	}
	return candidate;
}

function readNext(form: FormData): string {
	return safeNextPath(String(form.get('next') ?? DEFAULT_NEXT_PATH));
}

function readEmail(form: FormData): string {
	return String(form.get('email') ?? '').trim().toLowerCase();
}

function invalidLogin(email: string, next: string, error: string) {
	return fail(BAD_REQUEST_STATUS, { email, error, next } satisfies LoginFailure);
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
	email: async (event) => {
		const form = await event.request.formData();
		const email = readEmail(form);
		const password = String(form.get('password') ?? '');
		const next = readNext(form);
		if (!EMAIL_PATTERN.test(email)) {
			return invalidLogin(email, next, 'Enter a valid email address.');
		}
		if (password.length < MIN_PASSWORD_LENGTH) {
			return invalidLogin(email, next, `Use at least ${MIN_PASSWORD_LENGTH} characters.`);
		}
		const { error } = await event.locals.supabase.auth.signInWithPassword({ email, password });
		if (error) {
			return invalidLogin(email, next, error.message);
		}
		redirect(REDIRECT_STATUS, next);
	}
};
