import { describe, expect, it } from 'vitest';

import { countUserMessages, hasPendingReply } from './client-thread-reconcile.js';
import type { ChatMessage } from './messages.js';
import { normalizeHistoryMessages } from './messages.js';

describe('client-thread-reconcile', () => {
	it('counts user messages', () => {
		const messages: ChatMessage[] = [
			{ id: '1', role: 'user', text: 'a' },
			{ id: '2', role: 'assistant', text: 'b' },
			{ id: '3', role: 'user', text: 'c' }
		];
		expect(countUserMessages(messages)).toBe(2);
	});

	it('detects pending reply when the last user has no assistant', () => {
		const messages: ChatMessage[] = [{ id: '1', role: 'user', text: 'waiting' }];
		expect(hasPendingReply(messages)).toBe(true);
	});

	it('returns false when the latest user turn is complete', () => {
		const messages: ChatMessage[] = [
			{ id: '1', role: 'user', text: 'q' },
			{ id: '2', role: 'assistant', text: 'a' }
		];
		expect(hasPendingReply(messages)).toBe(false);
	});

	it('keeps a latest commentary turn pending', () => {
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

		expect(hasPendingReply(messages)).toBe(true);
	});
});
