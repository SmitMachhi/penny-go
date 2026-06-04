import { describe, expect, it } from 'vitest';

import { parseMaxHeightPx } from './auto-resize-textarea.js';

describe('parseMaxHeightPx', () => {
	it('uses scroll height when max height is none', () => {
		expect(parseMaxHeightPx('none', 120)).toBe(120);
	});

	it('parses pixel max height from computed style', () => {
		expect(parseMaxHeightPx('208px', 400)).toBe(208);
	});

	it('falls back when max height is not parseable', () => {
		expect(parseMaxHeightPx('invalid', 96)).toBe(208);
	});
});
