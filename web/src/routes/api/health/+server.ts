import { json } from '@sveltejs/kit';

import { pingGateway } from '$lib/server/chat-service.js';

export async function GET() {
	try {
		const status = await pingGateway();
		return json(status);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'gateway unavailable';
		return json({ ok: false, message }, { status: 503 });
	}
}
