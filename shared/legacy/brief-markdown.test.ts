import assert from 'node:assert/strict';
import test from 'node:test';
import { marked } from 'marked';

import {
	extractProgramPlaceholderIndices,
	renderBriefMarkdown,
	splitProgramPlaceholderMarkdown
} from './brief-markdown.ts';

test('renderBriefMarkdown converts markdown headings and links', () => {
	const html = renderBriefMarkdown('## Summary\n\nSee [CRA](https://www.canada.ca)', marked);
	assert.match(html, /<h2>Summary<\/h2>/);
	assert.match(html, /href="https:\/\/www\.canada\.ca"/);
});

test('splitProgramPlaceholderMarkdown preserves markdown and program indices', () => {
	const segments = splitProgramPlaceholderMarkdown('Intro\n\n{{program:0}}\n\nOutro');
	assert.deepEqual(segments, [
		{ type: 'markdown', value: 'Intro\n\n' },
		{ type: 'program', index: 0 },
		{ type: 'markdown', value: '\n\nOutro' }
	]);
	assert.deepEqual(extractProgramPlaceholderIndices('{{program:1}} {{program:0}}'), [1, 0]);
});

test('renderBriefMarkdown strips disallowed tags', () => {
	const html = renderBriefMarkdown('<script>alert(1)</script>\n\nSafe text', marked);
	assert.doesNotMatch(html, /<script/);
	assert.match(html, /Safe text/);
});

test('renderBriefMarkdown renders printable task checkboxes', () => {
	const html = renderBriefMarkdown('- [ ] Register for portal\n- [x] Confirm eligibility', marked);
	assert.match(html, /task-checkbox/);
	assert.doesNotMatch(html, /<input/);
});
