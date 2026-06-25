import type { EmailOtpType } from '@supabase/supabase-js';
import { redirect } from '@sveltejs/kit';

const DEFAULT_NEXT_PATH = '/';
const REDIRECT_STATUS = 303;

function safeNextPath(candidate: string | null): string {
	if (!candidate?.startsWith('/') || candidate.startsWith('//')) {
		return DEFAULT_NEXT_PATH;
	}
	return candidate;
}

function isEmailOtpType(value: string | null): value is EmailOtpType {
	return (
		value === 'email' ||
		value === 'email_change' ||
		value === 'invite' ||
		value === 'magiclink' ||
		value === 'recovery' ||
		value === 'signup'
	);
}

export async function GET(event) {
	const next = safeNextPath(event.url.searchParams.get('next'));
	const code = event.url.searchParams.get('code');
	if (code) {
		const { error } = await event.locals.supabase.auth.exchangeCodeForSession(code);
		if (!error) {
			redirect(REDIRECT_STATUS, next);
		}
	}
	const tokenHash = event.url.searchParams.get('token_hash');
	const type = event.url.searchParams.get('type');
	if (tokenHash && isEmailOtpType(type)) {
		const { error } = await event.locals.supabase.auth.verifyOtp({
			token_hash: tokenHash,
			type
		});
		if (!error) {
			redirect(REDIRECT_STATUS, next);
		}
	}
	redirect(REDIRECT_STATUS, `/login?next=${encodeURIComponent(next)}`);
}
