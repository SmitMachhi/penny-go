import { describe, expect, it } from 'vitest';

import { buildEvidenceQuestState } from '$lib/chat/evidence-quest.js';
import type { ToolActivity } from '$lib/chat/messages.js';

function tool(name: string, phase: ToolActivity['phase']): ToolActivity {
	return { id: `${name}-${phase}`, name, phase };
}

describe('buildEvidenceQuestState', () => {
	it('starts with ask done and find active before tools report', () => {
		const state = buildEvidenceQuestState({ tools: [], answerStarted: false });

		expect(state.status).toBe('checking evidence');
		expect(state.stages.map((stage) => [stage.id, stage.phase])).toEqual([
			['ask', 'done'],
			['find', 'active'],
			['check', 'pending'],
			['plan', 'pending']
		]);
		expect(state.tokens).toEqual([]);
	});

	it('adds corpus and source tokens from completed tools', () => {
		const state = buildEvidenceQuestState({
			answerStarted: false,
			tools: [
				tool('search_corpus', 'done'),
				tool('read_official_source', 'done')
			]
		});

		expect(state.status).toBe('building evidence');
		expect(state.stages.map((stage) => [stage.id, stage.phase])).toEqual([
			['ask', 'done'],
			['find', 'done'],
			['check', 'done'],
			['plan', 'active']
		]);
		expect(state.tokens.map((token) => token.label)).toEqual([
			'corpus match',
			'official source'
		]);
	});

	it('adds a web source token when web search completes', () => {
		const state = buildEvidenceQuestState({
			answerStarted: false,
			tools: [tool('web_search', 'done')]
		});

		expect(state.tokens.map((token) => token.label)).toEqual(['web source']);
		expect(state.stages.find((stage) => stage.id === 'find')?.phase).toBe('done');
	});

	it('shows plan building while the funding brief tool runs', () => {
		const state = buildEvidenceQuestState({
			answerStarted: false,
			tools: [
				tool('search_corpus', 'done'),
				tool('read_official_source', 'done'),
				tool('create_funding_brief', 'running')
			]
		});

		expect(state.status).toBe('building plan');
		expect(state.stages.find((stage) => stage.id === 'plan')?.phase).toBe('active');
		expect(state.tokens.map((token) => token.label)).toEqual([
			'corpus match',
			'official source',
			'plan building'
		]);
	});

	it('uses active tool status while search tools run', () => {
		expect(
			buildEvidenceQuestState({
				answerStarted: false,
				tools: [tool('search_corpus', 'running')]
			}).status
		).toBe('searching corpus');
		expect(
			buildEvidenceQuestState({
				answerStarted: false,
				tools: [tool('web_search', 'running')]
			}).status
		).toBe('searching web');
	});

	it('uses an answering status once response text starts streaming', () => {
		const state = buildEvidenceQuestState({
			answerStarted: true,
			tools: [tool('search_corpus', 'done')]
		});

		expect(state.status).toBe('answering from evidence');
	});
});
