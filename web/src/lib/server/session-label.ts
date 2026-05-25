import { ValidationError } from '$lib/server/api-error.js';
import { MAX_SESSION_LABEL_LENGTH } from '$lib/server/session-key.js';

export class SessionLabelError extends ValidationError {
	constructor(message = 'label is required') {
		super(message);
		this.name = 'SessionLabelError';
	}
}

export function parseOptionalSessionLabel(raw: string | undefined): string | undefined {
	const trimmed = raw?.trim().slice(0, MAX_SESSION_LABEL_LENGTH);
	return trimmed || undefined;
}

export function parseSessionLabel(raw: string | undefined): string {
	const trimmed = parseOptionalSessionLabel(raw);
	if (!trimmed) {
		throw new SessionLabelError();
	}
	return trimmed;
}
