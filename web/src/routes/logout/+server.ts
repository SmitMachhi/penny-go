import { redirect } from '@sveltejs/kit';

const REDIRECT_STATUS = 303;

export async function POST(event) {
	await event.locals.supabase.auth.signOut();
	redirect(REDIRECT_STATUS, '/login');
}
