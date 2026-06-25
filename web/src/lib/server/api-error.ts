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

export class ConflictError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ConflictError';
	}
}

export function classifyApiErrorStatus(error: unknown): number {
	if (isHttpError(error)) {
		return error.status;
	}
	if (error instanceof AuthRequiredError) {
		return 401;
	}
	if (error instanceof ConflictError) {
		return 409;
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
	const message = publicApiErrorMessage(error, fallback);
	return { body: { error: message }, status: classifyApiErrorStatus(error) };
}

function publicApiErrorMessage(error: unknown, fallback: string): string {
	if (
		error instanceof AuthRequiredError ||
		error instanceof SessionKeyError ||
		error instanceof ValidationError ||
		error instanceof ConflictError
	) {
		return error.message;
	}
	if (isHttpError(error)) {
		return typeof error.body.message === 'string' ? error.body.message : fallback;
	}
	return fallback;
}
