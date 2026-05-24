import { describe, expect, it } from 'vitest';

import { extractMessageText, normalizeHistoryMessages, toolLabel } from './messages.js';

describe('extractMessageText', () => {
	it('reads plain text field', () => {
		expect(extractMessageText({ text: 'hello' })).toBe('hello');
	});

	it('joins content parts', () => {
		expect(
			extractMessageText({
				content: [{ type: 'text', text: 'one ' }, { type: 'text', text: 'two' }]
			})
		).toBe('one two');
	});
});

describe('normalizeHistoryMessages', () => {
	it('keeps user and assistant messages with text', () => {
		const messages = normalizeHistoryMessages([
			{ role: 'user', content: [{ type: 'text', text: 'Hi Penny' }] },
			{ role: 'assistant', content: [{ type: 'text', text: 'Hello' }] },
			{ role: 'tool', content: [{ type: 'text', text: 'ignored' }] }
		]);

		expect(messages).toHaveLength(2);
		expect(messages[0]?.role).toBe('user');
		expect(messages[1]?.text).toBe('Hello');
	});
});

describe('toolLabel', () => {
	it('maps penny tools to friendly labels', () => {
		expect(toolLabel('search_corpus')).toContain('corpus');
		expect(toolLabel('read_official_source')).toContain('official');
	});
});
