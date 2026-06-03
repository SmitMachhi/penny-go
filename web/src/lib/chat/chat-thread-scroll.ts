/** Distance from the bottom (px) still treated as "at bottom" for follow mode. */
export const CHAT_NEAR_BOTTOM_THRESHOLD_PX = 80;

export function distanceFromThreadBottom(element: HTMLElement): number {
	return element.scrollHeight - element.scrollTop - element.clientHeight;
}

export function isThreadNearBottom(
	element: HTMLElement,
	thresholdPx = CHAT_NEAR_BOTTOM_THRESHOLD_PX
): boolean {
	return distanceFromThreadBottom(element) <= thresholdPx;
}

export function scrollThreadToBottom(
	element: HTMLElement,
	behavior: ScrollBehavior = 'smooth'
): void {
	element.scrollTo({ top: element.scrollHeight, behavior });
}
