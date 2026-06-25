import type { EmailOtpType } from '@supabase/supabase-js';
import { redirect } from '@sveltejs/kit';

const DEFAULT_NEXT_PATH = '/';
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

function safeNextPath(candidate: string | null): string {
	if (!candidate?.startsWith('/')) {
		return DEFAULT_NEXT_PATH;
	}
	if (candidate.startsWith('//')) {
		return DEFAULT_NEXT_PATH;
	}
	return candidate;
}

export async function GET(event) {
	const tokenHash = event.url.searchParams.get('token_hash');
	const type = event.url.searchParams.get('type');
	const next = safeNextPath(event.url.searchParams.get('next'));

	if (tokenHash && isEmailOtpType(type)) {
		const { error } = await event.locals.supabase.auth.verifyOtp({
			token_hash: tokenHash,
			type
		});
		if (!error) {
			redirect(303, next);
		}
	}

	redirect(303, `/auth/sign-in?next=${encodeURIComponent(next)}`);
}
