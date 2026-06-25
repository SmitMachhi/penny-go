import { isHttpError } from '@sveltejs/kit';

import { SessionKeyError } from '$lib/server/session-key.js';

export class AuthRequiredError extends Error {
	constructor(message = 'authentication required') {
		super(message);
		this.name = 'AuthRequiredError';
	}
}

export class ValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ValidationError';
	}
}

export function classifyApiErrorStatus(error: unknown): number {
	if (isHttpError(error)) {
		return error.status;
	}
	if (error instanceof AuthRequiredError) {
		return 401;
	}
	if (error instanceof SessionKeyError || error instanceof ValidationError) {
		return error instanceof ValidationError ? 400 : 403;
	}
	return 503;
}

export function toApiErrorResponse(
	error: unknown,
	fallback: string
): { body: { error: string }; status: number } {
	const message = error instanceof Error ? error.message : fallback;
	return { body: { error: message }, status: classifyApiErrorStatus(error) };
}
