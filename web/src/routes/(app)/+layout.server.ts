import { redirect } from '@sveltejs/kit';

export const load = ({ locals, url }) => {
	if (locals.user) {
		return {};
	}
	const next = `${url.pathname}${url.search}`;
	redirect(303, `/auth/sign-in?next=${encodeURIComponent(next)}`);
};
