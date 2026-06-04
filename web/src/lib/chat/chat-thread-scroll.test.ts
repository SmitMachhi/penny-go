import { describe, expect, it } from 'vitest';

import {
	CHAT_NEAR_BOTTOM_THRESHOLD_PX,
	CHAT_THREAD_IDLE_BOTTOM_PADDING_PX,
	CHAT_THREAD_SENDING_BOTTOM_PADDING_PX,
	distanceFromThreadBottom,
	isThreadNearBottom,
	resolveThreadBottomSpacerHeightPx,
	scrollThreadToBottom,
	scrollThreadToWorkingAnchor
} from './chat-thread-scroll.js';

function mockThreadElement(overrides: {
	scrollHeight?: number;
	scrollTop?: number;
	clientHeight?: number;
	offsetTop?: number;
}): HTMLElement {
	const scrollHeight = overrides.scrollHeight ?? 1000;
	const scrollTop = overrides.scrollTop ?? 0;
	const clientHeight = overrides.clientHeight ?? 400;
	const offsetTop = overrides.offsetTop ?? 0;

	return {
		scrollHeight,
		scrollTop,
		clientHeight,
		offsetTop,
		scrollTo: () => undefined
	} as unknown as HTMLElement;
}

describe('distanceFromThreadBottom', () => {
	it('returns zero when scrolled to the bottom', () => {
		const element = mockThreadElement({ scrollHeight: 1000, scrollTop: 600, clientHeight: 400 });
		expect(distanceFromThreadBottom(element)).toBe(0);
	});

	it('returns positive distance when scrolled up', () => {
		const element = mockThreadElement({ scrollHeight: 1000, scrollTop: 100, clientHeight: 400 });
		expect(distanceFromThreadBottom(element)).toBe(500);
	});
});

describe('isThreadNearBottom', () => {
	it('is true within the threshold', () => {
		const element = mockThreadElement({
			scrollHeight: 1000,
			scrollTop: 520,
			clientHeight: 400
		});
		expect(isThreadNearBottom(element, CHAT_NEAR_BOTTOM_THRESHOLD_PX)).toBe(true);
	});

	it('is false when far from the bottom', () => {
		const element = mockThreadElement({ scrollHeight: 1000, scrollTop: 0, clientHeight: 400 });
		expect(isThreadNearBottom(element, CHAT_NEAR_BOTTOM_THRESHOLD_PX)).toBe(false);
	});
});

describe('resolveThreadBottomSpacerHeightPx', () => {
	it('uses idle padding when not sending', () => {
		expect(resolveThreadBottomSpacerHeightPx({ sending: false })).toBe(
			CHAT_THREAD_IDLE_BOTTOM_PADDING_PX
		);
	});

	it('uses modest sending padding without hiding the working card', () => {
		expect(resolveThreadBottomSpacerHeightPx({ sending: true })).toBe(
			CHAT_THREAD_SENDING_BOTTOM_PADDING_PX
		);
	});
});

describe('scrollThreadToBottom', () => {
	it('scrolls to scrollHeight', () => {
		let scrolledTop = -1;
		const element = {
			scrollHeight: 2400,
			scrollTo: ({ top }: { top: number }) => {
				scrolledTop = top;
			}
		} as unknown as HTMLElement;

		scrollThreadToBottom(element, 'auto');
		expect(scrolledTop).toBe(2400);
	});
});

describe('scrollThreadToWorkingAnchor', () => {
	it('scrolls to the anchor offset inside the thread', () => {
		let scrolledTop = -1;
		const thread = {
			scrollTop: 100,
			getBoundingClientRect: () => ({ top: 50 }),
			scrollTo: ({ top }: { top: number }) => {
				scrolledTop = top;
			}
		} as unknown as HTMLElement;
		const anchor = {
			getBoundingClientRect: () => ({ top: 470 })
		} as unknown as HTMLElement;

		scrollThreadToWorkingAnchor(thread, anchor, 'auto');
		expect(scrolledTop).toBe(504);
	});
});
