export type RequestErrorKind = 'network' | 'http' | 'parse' | 'abort';

export type ClassifiedRequestError = {
	kind: RequestErrorKind;
	message: string;
	retryable: boolean;
};

const NETWORK_UNREACHABLE_MESSAGE =
	'Penny could not reach the server. Is the dev server running?';

function parseNestedErrorMessage(message: string): string {
	const trimmed = message.trim();
	if (!trimmed.startsWith('{')) {
		return message;
	}
	try {
		const parsed = JSON.parse(trimmed) as { message?: unknown };
		if (typeof parsed.message === 'string' && parsed.message.trim()) {
			return parsed.message.trim();
		}
	} catch {
		return message;
	}
	return message;
}

export function isAbortError(error: unknown): boolean {
	return error instanceof DOMException && error.name === 'AbortError';
}

export function classifyRequestError(error: unknown, fallback: string): ClassifiedRequestError {
	if (isAbortError(error)) {
		return { kind: 'abort', message: fallback, retryable: true };
	}
	if (error instanceof TypeError && error.message === 'Failed to fetch') {
		return { kind: 'network', message: NETWORK_UNREACHABLE_MESSAGE, retryable: true };
	}
	if (error instanceof Error) {
		return { kind: 'http', message: parseNestedErrorMessage(error.message), retryable: false };
	}
	return { kind: 'http', message: fallback, retryable: false };
}

export function formatRequestError(error: unknown, fallback: string): string {
	return classifyRequestError(error, fallback).message;
}
