import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const BAD_REQUEST_STATUS = 400;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_NEXT_PATH = '/';
const MIN_PASSWORD_LENGTH = 8;
const REDIRECT_STATUS = 303;
const VERIFICATION_CODE_LENGTH = 6;
const VERIFICATION_CODE_PATTERN = new RegExp(`^[0-9]{${VERIFICATION_CODE_LENGTH}}$`);

type AuthMode = 'sign-in' | 'sign-up' | 'verify';

type AuthFailure = {
	email: string;
	error: string;
	mode: AuthMode;
	next: string;
};

function safeNextPath(candidate: string | null): string {
	if (!candidate?.startsWith('/')) {
		return DEFAULT_NEXT_PATH;
	}
	if (candidate.startsWith('//')) {
		return DEFAULT_NEXT_PATH;
	}
	return candidate;
}

function authRedirectUrl(origin: string, next: string): string {
	const redirectTo = new URL('/auth/confirm', origin);
	redirectTo.searchParams.set('next', next);
	return redirectTo.toString();
}

function readEmail(form: FormData): string {
	return String(form.get('email') ?? '').trim().toLowerCase();
}

function readNext(form: FormData): string {
	return safeNextPath(String(form.get('next') ?? DEFAULT_NEXT_PATH));
}

function invalidAuth(email: string, next: string, mode: AuthMode, error: string) {
	return fail(BAD_REQUEST_STATUS, { email, error, mode, next } satisfies AuthFailure);
}

function validatePassword(password: string, email: string, next: string, mode: AuthMode) {
	if (password.length < MIN_PASSWORD_LENGTH) {
		return invalidAuth(email, next, mode, `Use at least ${MIN_PASSWORD_LENGTH} characters.`);
	}
	return null;
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
	signIn: async (event) => {
		const form = await event.request.formData();
		const email = readEmail(form);
		const password = String(form.get('password') ?? '');
		const next = readNext(form);
		if (!EMAIL_PATTERN.test(email)) {
			return invalidAuth(email, next, 'sign-in', 'Enter a valid email address.');
		}
		const passwordError = validatePassword(password, email, next, 'sign-in');
		if (passwordError) {
			return passwordError;
		}
		const { error } = await event.locals.supabase.auth.signInWithPassword({
			email,
			password
		});
		if (error) {
			return invalidAuth(email, next, 'sign-in', error.message);
		}
		redirect(REDIRECT_STATUS, next);
	},

	signUp: async (event) => {
		const form = await event.request.formData();
		const email = readEmail(form);
		const password = String(form.get('password') ?? '');
		const next = readNext(form);
		if (!EMAIL_PATTERN.test(email)) {
			return invalidAuth(email, next, 'sign-up', 'Enter a valid email address.');
		}
		const passwordError = validatePassword(password, email, next, 'sign-up');
		if (passwordError) {
			return passwordError;
		}
		const { data, error } = await event.locals.supabase.auth.signUp({
			email,
			password,
			options: { emailRedirectTo: authRedirectUrl(event.url.origin, next) }
		});
		if (error) {
			return invalidAuth(email, next, 'sign-up', error.message);
		}
		if (data.session) {
			redirect(REDIRECT_STATUS, next);
		}
		return { email, mode: 'verify' as const, next };
	},

	verifyCode: async (event) => {
		const form = await event.request.formData();
		const email = readEmail(form);
		const token = String(form.get('token') ?? '').trim();
		const next = readNext(form);
		if (!EMAIL_PATTERN.test(email)) {
			return invalidAuth(email, next, 'verify', 'Enter a valid email address.');
		}
		if (!VERIFICATION_CODE_PATTERN.test(token)) {
			return invalidAuth(email, next, 'verify', `Enter the ${VERIFICATION_CODE_LENGTH}-digit code.`);
		}
		const { error } = await event.locals.supabase.auth.verifyOtp({
			email,
			token,
			type: 'email'
		});
		if (error) {
			return invalidAuth(email, next, 'verify', error.message);
		}
		redirect(REDIRECT_STATUS, next);
	},

	google: async (event) => {
		const form = await event.request.formData();
		const next = readNext(form);
		const { data, error } = await event.locals.supabase.auth.signInWithOAuth({
			provider: 'google',
			options: { redirectTo: authRedirectUrl(event.url.origin, next) }
		});
		if (error || !data.url) {
			return invalidAuth('', next, 'sign-in', error?.message ?? 'Google sign-in failed.');
		}
		redirect(REDIRECT_STATUS, data.url);
	}
};
