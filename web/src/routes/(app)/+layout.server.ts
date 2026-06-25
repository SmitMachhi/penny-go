import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

const REDIRECT_STATUS = 303;

export const load: LayoutServerLoad = ({ locals, url }) => {
	if (locals.user) {
		return {};
	}
	const next = `${url.pathname}${url.search}`;
	redirect(REDIRECT_STATUS, `/login?next=${encodeURIComponent(next)}`);
};
