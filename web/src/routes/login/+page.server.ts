import type { Provider } from '@supabase/supabase-js';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const BAD_REQUEST_STATUS = 400;
const DEFAULT_NEXT_PATH = '/';
const REDIRECT_STATUS = 303;

type LoginFailure = {
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

function callbackUrl(origin: string, next: string): string {
	const url = new URL('/auth/callback', origin);
	url.searchParams.set('next', next);
	return url.toString();
}

async function oauthRedirect(event: Parameters<Actions['google']>[0], provider: Provider) {
	const form = await event.request.formData();
	const next = readNext(form);
	const { data, error } = await event.locals.supabase.auth.signInWithOAuth({
		provider,
		options: { redirectTo: callbackUrl(event.url.origin, next) }
	});
	if (error || !data.url) {
		return fail(BAD_REQUEST_STATUS, {
			error: error?.message ?? 'Login failed.',
			next
		} satisfies LoginFailure);
	}
	redirect(REDIRECT_STATUS, data.url);
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
	google: (event) => oauthRedirect(event, 'google'),
	microsoft: (event) => oauthRedirect(event, 'azure')
};
