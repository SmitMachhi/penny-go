import { describe, expect, it, vi } from 'vitest';

import { markPennyTiming, measurePennyTiming } from './performance-metrics.js';

describe('performance metrics', () => {
	it('marks named Penny timings', () => {
		const mark = vi.fn();

		markPennyTiming('app_boot', { performanceApi: { mark } });

		expect(mark).toHaveBeenCalledWith('penny:app_boot');
	});

	it('measures named Penny timings between marks', () => {
		const measure = vi.fn();

		measurePennyTiming('send_to_first_token', {
			startMark: 'send_start',
			endMark: 'first_token',
			performanceApi: { measure }
		});

		expect(measure).toHaveBeenCalledWith(
			'penny:send_to_first_token',
			'penny:send_start',
			'penny:first_token'
		);
	});
});
