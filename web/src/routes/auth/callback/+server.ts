import { redirect } from '@sveltejs/kit';

const DEFAULT_NEXT_PATH = '/';
const REDIRECT_STATUS = 303;

function safeNextPath(candidate: string | null): string {
	if (!candidate?.startsWith('/') || candidate.startsWith('//')) {
		return DEFAULT_NEXT_PATH;
	}
	return candidate;
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
	redirect(REDIRECT_STATUS, `/login?next=${encodeURIComponent(next)}`);
}
