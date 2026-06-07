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

	it('coalesces intermediate assistant commentary into a thinking trace', () => {
		const messages = normalizeHistoryMessages([
			{ role: 'user', content: [{ type: 'text', text: 'Fund my project' }] },
			{ role: 'assistant', content: [{ type: 'text', text: 'Searching corpus…' }] },
			{ role: 'assistant', content: [{ type: 'text', text: 'Verifying sources…' }] },
			{
				role: 'assistant',
				content: [
					{
						type: 'text',
						text: 'Brief created.',
						textSignature: JSON.stringify({ v: 1, id: 'a1', phase: 'final_answer' })
					}
				]
			}
		]);

		expect(messages).toHaveLength(2);
		expect(messages[1]?.text).toBe('Brief created.');
		expect(messages[1]?.thinkingTrace).toBe('Searching corpus…\n\nVerifying sources…');
	});

	it('keeps commentary-only assistant text marked as commentary', () => {
		const messages = normalizeHistoryMessages([
			{ role: 'user', content: [{ type: 'text', text: 'Find grants' }] },
			{
				role: 'assistant',
				content: [
					{
						type: 'text',
						text: 'Let me verify the official program pages.',
						textSignature: JSON.stringify({ v: 1, id: 'a1', phase: 'commentary' })
					}
				]
			}
		]);

		expect(messages[1]).toMatchObject({
			role: 'assistant',
			text: 'Let me verify the official program pages.',
			phase: 'commentary'
		});
	});

	it('treats persisted tool-use assistant text as commentary', () => {
		const messages = normalizeHistoryMessages([
			{ role: 'user', content: [{ type: 'text', text: 'Create the funding brief' }] },
			{
				role: 'assistant',
				stopReason: 'toolUse',
				content: [
					{
						type: 'text',
						text: 'Now I have a clear picture. Let me create the funding brief with my findings.'
					},
					{
						type: 'toolCall',
						toolCallId: 'call-create-brief',
						toolName: 'create_funding_brief'
					}
				]
			}
		]);

		expect(messages[1]).toMatchObject({
			role: 'assistant',
			text: 'Now I have a clear picture. Let me create the funding brief with my findings.',
			phase: 'commentary'
		});
	});
});

describe('toolLabel', () => {
	it('maps penny tools to friendly labels', () => {
		expect(toolLabel('search_corpus')).toContain('corpus');
		expect(toolLabel('read_official_source')).toContain('official');
	});
});
