import type { RunTraceState } from '$lib/chat/client-run-trace.js';
import type { ToolActivity } from '$lib/chat/messages.js';
import {
	getToolPresentation,
	hasRunningTools,
	sortToolsForDisplay
} from '$lib/chat/tool-presentations.js';

/** Max characters shown in the live status headline. */
export const RUN_STATUS_HEADLINE_MAX_LEN = 160;

/** Segments longer than this are treated as answer draft, not status copy. */
export const RUN_STATUS_COMMENTARY_SEGMENT_MAX_LEN = 280;

const THINKING_FALLBACK = 'Thinking…';
const WORKING_FALLBACK = 'Working for you…';

function trimToHeadline(text: string): string {
	const normalized = text.replace(/\s+/g, ' ').trim();
	if (normalized.length <= RUN_STATUS_HEADLINE_MAX_LEN) {
		return normalized;
	}
	return `${normalized.slice(0, RUN_STATUS_HEADLINE_MAX_LEN - 1)}…`;
}

function lastNonEmptyLine(text: string): string {
	const lines = text.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
	return lines.at(-1) ?? '';
}

function isCommentarySizedSegment(text: string): boolean {
	return text.trim().length > 0 && text.trim().length <= RUN_STATUS_COMMENTARY_SEGMENT_MAX_LEN;
}

function commentaryCandidates(trace: RunTraceState): string[] {
	const candidates: string[] = [];
	for (const segment of trace.segments) {
		if (isCommentarySizedSegment(segment)) {
			candidates.push(segment.trim());
		}
	}
	const live = trace.liveSegment.trim();
	if (!live) {
		return candidates;
	}
	if (isCommentarySizedSegment(live)) {
		candidates.push(live);
		return candidates;
	}
	const line = lastNonEmptyLine(live);
	if (line.length > 0 && line.length <= RUN_STATUS_HEADLINE_MAX_LEN) {
		candidates.push(line);
	}
	return candidates;
}

function fallbackToolHeadline(tools: readonly ToolActivity[]): string {
	const ordered = sortToolsForDisplay([...tools]);
	const running = ordered.find((tool) => tool.phase === 'running');
	if (running) {
		return getToolPresentation(running.name).label;
	}
	if (hasRunningTools(tools)) {
		return WORKING_FALLBACK;
	}
	return THINKING_FALLBACK;
}

/** User-visible status: Penny commentary first, then active tool label. */
export function extractRunStatusHeadline(
	trace: RunTraceState,
	tools: readonly ToolActivity[]
): string {
	const candidates = commentaryCandidates(trace);
	const last = candidates.at(-1);
	if (last) {
		const line = lastNonEmptyLine(last);
		if (line.length > 0) {
			return trimToHeadline(line);
		}
	}
	return fallbackToolHeadline(tools);
}

/** Trace body for “How Penny researched this” — omits answer-sized live stream. */
export function researchTraceText(trace: RunTraceState, streamingAnswer: string): string {
	const parts: string[] = [];
	if (trace.thinkingText.trim()) {
		parts.push(trace.thinkingText.trim());
	}
	if (trace.segments.length > 0) {
		parts.push(trace.segments.join('\n\n'));
	}
	const live = trace.liveSegment.trim();
	const answer = streamingAnswer.trim();
	if (!live) {
		return parts.join('\n\n');
	}
	if (answer && (live === answer || answer.includes(live))) {
		return parts.join('\n\n');
	}
	if (isCommentarySizedSegment(live)) {
		parts.push(live);
	}
	return parts.join('\n\n');
}
