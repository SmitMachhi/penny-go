import { redirect } from '@sveltejs/kit';

export async function POST(event) {
	await event.locals.supabase.auth.signOut();
	redirect(303, '/auth/sign-in');
}
