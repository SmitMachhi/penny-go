import { describe, expect, it } from 'vitest';

import {
	getToolPresentation,
	hasRunningTools,
	sortToolsForDisplay,
	toolLabel
} from './tool-presentations.js';

describe('toolLabel', () => {
	it('maps penny tools to friendly labels', () => {
		expect(toolLabel('search_corpus')).toContain('corpus');
		expect(toolLabel('read_official_source')).toContain('official');
		expect(toolLabel('web_search')).toContain('Exa');
		expect(toolLabel('create_funding_brief')).toContain('strategy');
	});
});

describe('getToolPresentation', () => {
	it('returns distinct presentations for known tools', () => {
		const corpus = getToolPresentation('search_corpus');
		const verify = getToolPresentation('read_official_source');
		expect(corpus.label).not.toBe(verify.label);
		expect(corpus.capsuleRunning).not.toBe(verify.capsuleRunning);
	});

	it('falls back for unknown tools', () => {
		expect(getToolPresentation('mystery_tool').label).toBe('mystery_tool');
	});
});

describe('sortToolsForDisplay', () => {
	it('shows running tools before completed ones', () => {
		const sorted = sortToolsForDisplay([
			{ id: '1', name: 'web_search', phase: 'done' },
			{ id: '2', name: 'search_corpus', phase: 'running' }
		]);
		expect(sorted[0]?.name).toBe('search_corpus');
	});
});

describe('hasRunningTools', () => {
	it('detects active work', () => {
		expect(hasRunningTools([{ id: '1', name: 'web_search', phase: 'running' }])).toBe(true);
		expect(hasRunningTools([{ id: '1', name: 'web_search', phase: 'done' }])).toBe(false);
	});
});
