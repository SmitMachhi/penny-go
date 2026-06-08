import { describe, expect, it } from 'vitest';

import {
	BLOCK_STATUS_CHARACTERS,
	blockStatusTransitionText,
	WORKING_STATUS_LINES
} from '$lib/chat/block-status-transition.js';

describe('block status transition', () => {
	it('fully masks a working status with block characters at midpoint', () => {
		const text = blockStatusTransitionText({
			from: 'checking evidence',
			to: 'checking official pages',
			step: 4,
			totalSteps: 8
		});
		const blockCharacters: readonly string[] = BLOCK_STATUS_CHARACTERS;

		expect([...text].every((char) => blockCharacters.includes(char))).toBe(true);
	});

	it('resolves from the prior status into the next status', () => {
		expect(
			blockStatusTransitionText({
				from: 'checking evidence',
				to: 'checking official pages',
				step: 0,
				totalSteps: 8
			})
		).toBe('checking evidence');
		expect(
			blockStatusTransitionText({
				from: 'checking evidence',
				to: 'checking official pages',
				step: 8,
				totalSteps: 8
			})
		).toBe('checking official pages');
	});

	it('has enough varied working status lines', () => {
		expect(WORKING_STATUS_LINES.length).toBeGreaterThanOrEqual(6);
	});
});
