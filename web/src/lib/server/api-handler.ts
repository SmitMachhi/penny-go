import { json, type RequestEvent } from '@sveltejs/kit';

import { toApiErrorResponse } from '$lib/server/api-error.js';

type JsonResult = {
	body: unknown;
	status?: number;
};

type ApiHandlerOptions = {
	timingName?: string;
};

const SERVER_TIMING_PRECISION_DIGITS = 1;
const SERVER_TIMING_TOKEN_PATTERN = /^[a-z][a-z0-9_-]*$/;

function applyServerTiming(response: Response, timingName: string | undefined, startedAt: number): Response {
	if (!timingName) {
		return response;
	}
	if (!SERVER_TIMING_TOKEN_PATTERN.test(timingName)) {
		return response;
	}
	const durationMs = Math.max(0, performance.now() - startedAt);
	response.headers.set(
		'Server-Timing',
		`${timingName};dur=${durationMs.toFixed(SERVER_TIMING_PRECISION_DIGITS)}`
	);
	return response;
}

export async function withApiJson(
	handler: () => Promise<JsonResult | unknown>,
	fallbackMessage: string,
	options?: ApiHandlerOptions
): Promise<Response> {
	const startedAt = performance.now();
	try {
		const result = await handler();
		if (result !== null && typeof result === 'object' && 'body' in result) {
			const typed = result as JsonResult;
			return applyServerTiming(
				json(typed.body, typed.status ? { status: typed.status } : undefined),
				options?.timingName,
				startedAt
			);
		}
		return applyServerTiming(json(result), options?.timingName, startedAt);
	} catch (error) {
		const { body, status } = toApiErrorResponse(error, fallbackMessage);
		return applyServerTiming(json(body, { status }), options?.timingName, startedAt);
	}
}

export async function withApiJsonEvent(
	event: RequestEvent,
	handler: (event: RequestEvent) => Promise<JsonResult | unknown>,
	fallbackMessage: string,
	options?: ApiHandlerOptions
): Promise<Response> {
	return withApiJson(() => handler(event), fallbackMessage, options);
}

export async function withApiCatch(
	handler: () => Response | Promise<Response>,
	fallbackMessage: string,
	options?: ApiHandlerOptions
): Promise<Response> {
	const startedAt = performance.now();
	try {
		return applyServerTiming(await handler(), options?.timingName, startedAt);
	} catch (error) {
		const { body, status } = toApiErrorResponse(error, fallbackMessage);
		return applyServerTiming(json(body, { status }), options?.timingName, startedAt);
	}
}
