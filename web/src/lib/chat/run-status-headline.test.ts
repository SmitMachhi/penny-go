import { describe, expect, it } from 'vitest';

import { applyCommentaryDelta, createEmptyRunTrace } from '$lib/chat/client-run-trace.js';
import {
	extractRunStatusHeadline,
	researchTraceText,
	RUN_STATUS_COMMENTARY_SEGMENT_MAX_LEN
} from '$lib/chat/run-status-headline.js';
import type { ToolActivity } from '$lib/chat/messages.js';

describe('extractRunStatusHeadline', () => {
	it('prefers the latest short commentary over tool labels', () => {
		const trace = createEmptyRunTrace();
		applyCommentaryDelta(trace, 'Checking Ontario clean-tech grants in the corpus.');
		const tools: ToolActivity[] = [
			{ id: '1', name: 'search_corpus', phase: 'running' }
		];

		expect(extractRunStatusHeadline(trace, tools)).toBe(
			'Checking Ontario clean-tech grants in the corpus.'
		);
	});

	it('falls back to the active tool label when commentary is empty', () => {
		const trace = createEmptyRunTrace();
		const tools: ToolActivity[] = [
			{ id: '1', name: 'read_official_source', phase: 'running' }
		];

		expect(extractRunStatusHeadline(trace, tools)).toBe('Verifying official source');
	});

	it('uses the last line of a long live segment for the headline', () => {
		const trace = createEmptyRunTrace();
		const longBody = 'x'.repeat(RUN_STATUS_COMMENTARY_SEGMENT_MAX_LEN + 40);
		applyCommentaryDelta(trace, `${longBody}\n\nVerifying SR&ED intake pages next.`);

		expect(extractRunStatusHeadline(trace, [])).toBe('Verifying SR&ED intake pages next.');
	});
});

describe('researchTraceText', () => {
	it('drops live text that matches the streaming answer', () => {
		const trace = createEmptyRunTrace();
		const answer = 'Full answer body with programs listed.';
		applyCommentaryDelta(trace, 'Short status.');
		applyCommentaryDelta(trace, answer, { replace: true });

		expect(researchTraceText(trace, answer)).toBe('Short status.');
	});

	it('drops stored commentary segments that repeat the streaming answer', () => {
		const trace = createEmptyRunTrace();
		const answer = 'Let me grab the right workflow for this. Searching wider now.';
		applyCommentaryDelta(trace, 'Let me grab the right workflow for this.');
		applyCommentaryDelta(trace, answer, { replace: true });
		applyCommentaryDelta(trace, answer);

		expect(researchTraceText(trace, answer)).toBe('');
	});
});
