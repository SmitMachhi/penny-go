import { json } from '@sveltejs/kit';

import { checkPennyHealth } from '$lib/server/health-orchestration.js';
import { toApiErrorResponse } from '$lib/server/api-error.js';

export async function GET() {
	try {
		const status = await checkPennyHealth();
		return json(status);
	} catch (error) {
		const { body, status } = toApiErrorResponse(error, 'gateway unavailable');
		return json({ ok: false, message: body.error }, { status });
	}
}
