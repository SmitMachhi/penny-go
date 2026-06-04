import { describe, expect, it } from 'vitest';

import { countUserMessages, hasPendingReply } from './client-thread-reconcile.js';
import type { ChatMessage } from './messages.js';

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
});
