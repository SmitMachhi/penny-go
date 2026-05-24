export function applyStreamDelta(current: string, chunk: string, replace = false): string {
	if (replace) {
		return chunk;
	}
	if (chunk.startsWith(current)) {
		return chunk;
	}
	return current + chunk;
}
