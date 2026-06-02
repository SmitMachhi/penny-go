type StreamChunk = {
	text?: string;
	delta?: string;
	replace?: boolean;
};

export function resolveBufferedStreamText(
	runId: string,
	chunk: StreamChunk | undefined,
	buffer: Map<string, string>
): string | null {
	if (!chunk) {
		return null;
	}

	if (typeof chunk.text === 'string' && chunk.text) {
		buffer.set(runId, chunk.text);
		return chunk.text;
	}

	if (typeof chunk.delta !== 'string' || !chunk.delta) {
		return null;
	}

	const prior = chunk.replace ? '' : (buffer.get(runId) ?? '');
	const next = prior + chunk.delta;
	buffer.set(runId, next);
	return next;
}

export function clearBufferedStreamText(runId: string, buffer: Map<string, string>): void {
	buffer.delete(runId);
}

export function clearAllBufferedStreamText(buffer: Map<string, string>): void {
	buffer.clear();
}
