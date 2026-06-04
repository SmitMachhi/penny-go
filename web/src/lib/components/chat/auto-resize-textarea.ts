/** Matches Tailwind `max-h-52` (13rem at 16px root). */
const TEXTAREA_MAX_HEIGHT_FALLBACK_PX = 208;

export function parseMaxHeightPx(computedMaxHeight: string, scrollHeightPx: number): number {
	if (computedMaxHeight === 'none') {
		return scrollHeightPx;
	}
	const parsed = Number.parseFloat(computedMaxHeight);
	return Number.isFinite(parsed) ? parsed : TEXTAREA_MAX_HEIGHT_FALLBACK_PX;
}

export function syncTextareaHeight(element: HTMLTextAreaElement): void {
	element.style.height = 'auto';
	const maxHeightPx = parseMaxHeightPx(
		getComputedStyle(element).maxHeight,
		element.scrollHeight
	);
	const nextHeightPx = Math.min(element.scrollHeight, maxHeightPx);
	element.style.height = `${nextHeightPx}px`;
	element.style.overflowY = element.scrollHeight > maxHeightPx ? 'auto' : 'hidden';
}
