import { describe, expect, it } from 'vitest';

import {
	applyCommentaryDelta,
	applyThinkingDelta,
	createEmptyRunTrace,
	finalizeRunTrace,
	liveRunTraceText
} from './client-run-trace.js';

describe('client-run-trace', () => {
	it('accumulates commentary segments when replace starts a new block', () => {
		const trace = createEmptyRunTrace();
		applyCommentaryDelta(trace, 'Searching the corpus…');
		applyCommentaryDelta(trace, 'Verifying Ontario programs…', { replace: true });

		expect(liveRunTraceText(trace)).toBe('Searching the corpus…\n\nVerifying Ontario programs…');
	});

	it('includes model thinking text ahead of commentary', () => {
		const trace = createEmptyRunTrace();
		applyThinkingDelta(trace, 'Need IFIT and tax credits.');
		applyCommentaryDelta(trace, 'Let me verify the IFIT program.');

		expect(liveRunTraceText(trace)).toBe(
			'Need IFIT and tax credits.\n\nLet me verify the IFIT program.'
		);
	});

	it('returns undefined when nothing was streamed', () => {
		expect(finalizeRunTrace(createEmptyRunTrace(), 'Final answer')).toBeUndefined();
	});

	it('drops trace content already present in the final answer', () => {
		const trace = createEmptyRunTrace();
		applyCommentaryDelta(trace, 'Verifying Ontario programs…');
		applyCommentaryDelta(trace, 'Brief created.', { replace: true });

		expect(finalizeRunTrace(trace, 'Brief created.\n\nFull brief body')).toBe(
			'Verifying Ontario programs…'
		);
	});
});
