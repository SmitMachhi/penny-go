import { describe, expect, it } from 'vitest';

import { resolveEvidenceQuestThinking } from '$lib/chat/evidence-quest-visibility.js';

describe('resolveEvidenceQuestThinking', () => {
	it('suppresses generic thinking fallback copy before the answer starts', () => {
		expect(
			resolveEvidenceQuestThinking({
				answerStarted: false,
				statusHeadline: 'Thinking...',
				thinkingText: ''
			})
		).toBe('');
		expect(
			resolveEvidenceQuestThinking({
				answerStarted: false,
				statusHeadline: 'Thinking…',
				thinkingText: ''
			})
		).toBe('');
	});

	it('keeps concrete status copy before the answer starts', () => {
		expect(
			resolveEvidenceQuestThinking({
				answerStarted: false,
				statusHeadline: 'Reading official source',
				thinkingText: ''
			})
		).toBe('Reading official source');
	});

	it('prefers concrete model thinking over status fallback', () => {
		expect(
			resolveEvidenceQuestThinking({
				answerStarted: false,
				statusHeadline: 'Reading official source',
				thinkingText: 'Need IFIT and SR&ED evidence.'
			})
		).toBe('Need IFIT and SR&ED evidence.');
	});

	it('does not show status fallback after the answer starts', () => {
		expect(
			resolveEvidenceQuestThinking({
				answerStarted: true,
				statusHeadline: 'Reading official source',
				thinkingText: ''
			})
		).toBe('');
	});
});
