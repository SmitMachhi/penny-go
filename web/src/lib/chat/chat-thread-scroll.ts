/** Distance from the bottom (px) still treated as "at bottom" for follow mode. */
export const CHAT_NEAR_BOTTOM_THRESHOLD_PX = 80;

/** Bottom padding when the agent is idle (keeps last message off the composer). */
export const CHAT_THREAD_IDLE_BOTTOM_PADDING_PX = 48;

/** Fraction of the thread viewport reserved as empty space below the active turn while sending. */
export const CHAT_TURN_FOCUS_SPACER_RATIO = 0.45;

const CHAT_TURN_FOCUS_SPACER_MIN_PX = 120;
const CHAT_TURN_FOCUS_SPACER_MAX_PX = 480;

/** Used when the thread viewport has not been measured yet (e.g. first send). */
export const CHAT_THREAD_FALLBACK_CLIENT_HEIGHT_PX = 640;

export function distanceFromThreadBottom(element: HTMLElement): number {
	return element.scrollHeight - element.scrollTop - element.clientHeight;
}

export function isThreadNearBottom(
	element: HTMLElement,
	thresholdPx = CHAT_NEAR_BOTTOM_THRESHOLD_PX
): boolean {
	return distanceFromThreadBottom(element) <= thresholdPx;
}

/** Spacer height so "Thinking…" and the streaming reply sit above empty space, not the composer lip. */
export function computeTurnFocusSpacerHeightPx(threadClientHeightPx: number): number {
	const raw = Math.round(threadClientHeightPx * CHAT_TURN_FOCUS_SPACER_RATIO);
	return Math.min(
		CHAT_TURN_FOCUS_SPACER_MAX_PX,
		Math.max(CHAT_TURN_FOCUS_SPACER_MIN_PX, raw)
	);
}

export function resolveThreadBottomSpacerHeightPx(input: {
	sending: boolean;
	threadClientHeightPx: number;
}): number {
	if (!input.sending) {
		return CHAT_THREAD_IDLE_BOTTOM_PADDING_PX;
	}
	return computeTurnFocusSpacerHeightPx(input.threadClientHeightPx);
}

export function scrollThreadToBottom(
	element: HTMLElement,
	behavior: ScrollBehavior = 'smooth'
): void {
	element.scrollTo({ top: element.scrollHeight, behavior });
}
