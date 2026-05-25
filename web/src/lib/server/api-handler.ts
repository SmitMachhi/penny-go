import { json, type RequestEvent } from '@sveltejs/kit';

import { toApiErrorResponse } from '$lib/server/api-error.js';

type JsonResult = {
	body: unknown;
	status?: number;
};

export async function withApiJson(
	handler: () => Promise<JsonResult | unknown>,
	fallbackMessage: string
): Promise<Response> {
	try {
		const result = await handler();
		if (result !== null && typeof result === 'object' && 'body' in result) {
			const typed = result as JsonResult;
			return json(typed.body, typed.status ? { status: typed.status } : undefined);
		}
		return json(result);
	} catch (error) {
		const { body, status } = toApiErrorResponse(error, fallbackMessage);
		return json(body, { status });
	}
}

export async function withApiJsonEvent(
	event: RequestEvent,
	handler: (event: RequestEvent) => Promise<JsonResult | unknown>,
	fallbackMessage: string
): Promise<Response> {
	return withApiJson(() => handler(event), fallbackMessage);
}

export async function withApiCatch(
	handler: () => Response | Promise<Response>,
	fallbackMessage: string
): Promise<Response> {
	try {
		return await handler();
	} catch (error) {
		const { body, status } = toApiErrorResponse(error, fallbackMessage);
		return json(body, { status });
	}
}
