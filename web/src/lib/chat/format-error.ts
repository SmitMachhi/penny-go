import { formatRequestError } from '$lib/chat/request-error.js';

export function formatClientError(error: unknown, fallback: string): string {
	return formatRequestError(error, fallback);
}
