/** Distance from the bottom (px) still treated as "at bottom" for follow mode. */
export const CHAT_NEAR_BOTTOM_THRESHOLD_PX = 80;

/** Bottom padding when the agent is idle (keeps last message off the composer). */
export const CHAT_THREAD_IDLE_BOTTOM_PADDING_PX = 48;

/** Padding below the active turn while sending (keeps card off the composer without hiding it). */
export const CHAT_THREAD_SENDING_BOTTOM_PADDING_PX = 80;

/** Offset from the top of the thread when scrolling the working card into view. */
export const CHAT_WORKING_ANCHOR_SCROLL_OFFSET_PX = 16;

/** Used when the thread viewport has not been measured yet (e.g. first send). */
export const CHAT_THREAD_FALLBACK_CLIENT_HEIGHT_PX = 640;

type AnimationFrameScheduler = {
	requestAnimationFrame: (callback: FrameRequestCallback) => number;
	cancelAnimationFrame: (handle: number) => void;
};

export type ThreadScrollScheduler = {
	schedule: (scroll: () => void) => void;
	cancel: () => void;
};

function defaultAnimationFrameScheduler(): AnimationFrameScheduler {
	if (typeof requestAnimationFrame === 'undefined') {
		return {
			requestAnimationFrame: (callback) => {
				callback(0);
				return 0;
			},
			cancelAnimationFrame: () => {}
		};
	}
	return { requestAnimationFrame, cancelAnimationFrame };
}

export function createThreadScrollScheduler(
	scheduler = defaultAnimationFrameScheduler()
): ThreadScrollScheduler {
	let frameHandle: number | null = null;
	let pendingScroll: (() => void) | null = null;
	return {
		schedule(scroll) {
			pendingScroll = scroll;
			if (frameHandle !== null) {
				return;
			}
			frameHandle = scheduler.requestAnimationFrame(() => {
				frameHandle = null;
				const nextScroll = pendingScroll;
				pendingScroll = null;
				nextScroll?.();
			});
		},
		cancel() {
			if (frameHandle !== null) {
				scheduler.cancelAnimationFrame(frameHandle);
			}
			frameHandle = null;
			pendingScroll = null;
		}
	};
}

export function distanceFromThreadBottom(element: HTMLElement): number {
	return element.scrollHeight - element.scrollTop - element.clientHeight;
}

export function isThreadNearBottom(
	element: HTMLElement,
	thresholdPx = CHAT_NEAR_BOTTOM_THRESHOLD_PX
): boolean {
	return distanceFromThreadBottom(element) <= thresholdPx;
}

export function resolveThreadBottomSpacerHeightPx(input: {
	sending: boolean;
}): number {
	if (!input.sending) {
		return CHAT_THREAD_IDLE_BOTTOM_PADDING_PX;
	}
	return CHAT_THREAD_SENDING_BOTTOM_PADDING_PX;
}

/** Scroll so the in-flight working card stays in view (not past empty spacer). */
export function scrollThreadToWorkingAnchor(
	thread: HTMLElement,
	anchor: HTMLElement,
	behavior: ScrollBehavior = 'smooth'
): void {
	const anchorTop =
		anchor.getBoundingClientRect().top -
		thread.getBoundingClientRect().top +
		thread.scrollTop;
	thread.scrollTo({
		top: Math.max(0, anchorTop - CHAT_WORKING_ANCHOR_SCROLL_OFFSET_PX),
		behavior
	});
}

export function scrollThreadToBottom(
	element: HTMLElement,
	behavior: ScrollBehavior = 'smooth'
): void {
	element.scrollTo({ top: element.scrollHeight, behavior });
}
