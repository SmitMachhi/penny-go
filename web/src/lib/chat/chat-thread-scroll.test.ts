import { describe, expect, it } from 'vitest';

import {
	CHAT_NEAR_BOTTOM_THRESHOLD_PX,
	distanceFromThreadBottom,
	isThreadNearBottom,
	scrollThreadToBottom
} from './chat-thread-scroll.js';

function mockThreadElement(overrides: {
	scrollHeight?: number;
	scrollTop?: number;
	clientHeight?: number;
}): HTMLElement {
	const scrollHeight = overrides.scrollHeight ?? 1000;
	const scrollTop = overrides.scrollTop ?? 0;
	const clientHeight = overrides.clientHeight ?? 400;

	return {
		scrollHeight,
		scrollTop,
		clientHeight,
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
