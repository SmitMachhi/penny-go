export function applyStreamDelta(current: string, chunk: string): string {
	if (chunk.startsWith(current)) {
		return chunk;
	}
	return current + chunk;
}
