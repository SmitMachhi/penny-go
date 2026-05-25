export function normalizeToken(value: string): string {
	return value.trim().toLowerCase();
}

export function coerceSearchText(value: unknown): string {
	if (value === undefined || value === null) {
		return '';
	}

	return String(value).replace(/\s+/g, ' ').trim();
}

export function joinNormalizedHaystack(parts: readonly (string | undefined)[]): string {
	return normalizeToken(parts.filter(Boolean).join(' '));
}
