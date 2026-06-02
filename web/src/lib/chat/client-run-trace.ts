export type RunTraceState = {
	segments: string[];
	liveSegment: string;
	thinkingText: string;
};

export function createEmptyRunTrace(): RunTraceState {
	return {
		segments: [],
		liveSegment: '',
		thinkingText: ''
	};
}

export function applyCommentaryDelta(
	state: RunTraceState,
	text: string,
	options?: { replace?: boolean }
): void {
	if (options?.replace && state.liveSegment.trim()) {
		state.segments.push(state.liveSegment.trim());
	}
	state.liveSegment = text;
}

export function applyThinkingDelta(state: RunTraceState, text: string): void {
	state.thinkingText = text;
}

export function liveRunTraceText(state: RunTraceState): string {
	const parts: string[] = [];
	if (state.thinkingText.trim()) {
		parts.push(state.thinkingText.trim());
	}
	if (state.segments.length > 0) {
		parts.push(state.segments.join('\n\n'));
	}
	if (state.liveSegment.trim()) {
		parts.push(state.liveSegment.trim());
	}
	return parts.join('\n\n');
}

export function pruneTraceAgainstFinal(trace: string, finalText: string): string | undefined {
	const trimmedTrace = trace.trim();
	if (!trimmedTrace) {
		return undefined;
	}

	const trimmedFinal = finalText.trim();
	if (!trimmedFinal) {
		return trimmedTrace;
	}

	if (trimmedFinal.includes(trimmedTrace) || trimmedTrace.includes(trimmedFinal)) {
		return undefined;
	}

	const remainingParts = trimmedTrace
		.split('\n\n')
		.map((part) => part.trim())
		.filter((part) => part.length > 0 && !trimmedFinal.includes(part));

	const remaining = remainingParts.join('\n\n').trim();
	return remaining || undefined;
}

export function finalizeRunTrace(state: RunTraceState, finalText = ''): string | undefined {
	return pruneTraceAgainstFinal(liveRunTraceText(state), finalText);
}
