import { ValidationError } from '$lib/server/api-error.js';

type GenerateTitleRequestBody = {
	firstMessage?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export async function readGenerateTitleBody(request: Request): Promise<GenerateTitleRequestBody> {
	const body: unknown = await request.json().catch(() => ({}));
	if (!isRecord(body)) {
		throw new ValidationError('request body must be an object');
	}

	const firstMessage = body.firstMessage;
	if (firstMessage !== undefined && typeof firstMessage !== 'string') {
		throw new ValidationError('firstMessage must be a string');
	}

	return typeof firstMessage === 'string' ? { firstMessage } : {};
}
