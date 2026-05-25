export function formatClientError(error: unknown, fallback: string): string {
	return error instanceof Error ? error.message : fallback;
}
