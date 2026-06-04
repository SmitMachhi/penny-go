import { describe, expect, it } from 'vitest';

import { buildWorkSteps } from '$lib/chat/work-steps.js';

describe('buildWorkSteps', () => {
	it('shows a single starting step before any tools fire', () => {
		expect(buildWorkSteps([], true)).toEqual([
			{ id: 'starting', label: 'Getting started', phase: 'running' }
		]);
	});

	it('orders known tools and marks the next gap as running', () => {
		const steps = buildWorkSteps(
			[{ id: '1', name: 'search_corpus', phase: 'done' }],
			true
		);

		expect(steps.map((step) => step.id)).toEqual(['search_corpus', 'read_official_source']);
		expect(steps[0]?.phase).toBe('done');
		expect(steps[1]?.phase).toBe('running');
	});

	it('omits web_search until that tool appears', () => {
		const steps = buildWorkSteps(
			[
				{ id: '1', name: 'search_corpus', phase: 'done' },
				{ id: '2', name: 'read_official_source', phase: 'running' }
			],
			true
		);

		expect(steps.some((step) => step.id === 'web_search')).toBe(false);
	});

	it('includes web_search after it has started', () => {
		const steps = buildWorkSteps(
			[{ id: '1', name: 'web_search', phase: 'running' }],
			true
		);

		expect(steps.map((step) => step.id)).toContain('web_search');
	});
});
