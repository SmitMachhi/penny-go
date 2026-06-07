import type { ArtifactValidationError } from '@penny/shared/artifact-types';

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isOneOf<T extends string>(options: readonly T[], value: string): value is T {
	return options.some((option) => option === value);
}

export function readString(
	value: unknown,
	field: string,
	errors: ArtifactValidationError[]
): string | null {
	if (typeof value !== 'string' || value.trim().length === 0) {
		errors.push({ field, message: 'required non-empty string' });
		return null;
	}
	return value.trim();
}

export function readOptionalString(value: unknown): string | undefined {
	if (typeof value !== 'string') {
		return undefined;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}
