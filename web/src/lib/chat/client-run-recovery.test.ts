import { describe, expect, it } from 'vitest';

import { findCompletedAssistantAfterLastUser } from './client-run-recovery.js';
import type { ChatMessage } from './messages.js';

describe('findCompletedAssistantAfterLastUser', () => {
	it('returns the assistant reply after the latest user message', () => {
		const messages: ChatMessage[] = [
			{ id: '1', role: 'user', text: 'first' },
			{ id: '2', role: 'assistant', text: 'old reply' },
			{ id: '3', role: 'user', text: 'second' },
			{ id: '4', role: 'assistant', text: 'fresh reply' }
		];

		expect(findCompletedAssistantAfterLastUser(messages)?.text).toBe('fresh reply');
	});

	it('returns null when the latest user message has no assistant reply yet', () => {
		const messages: ChatMessage[] = [
			{ id: '1', role: 'user', text: 'still waiting' }
		];

		expect(findCompletedAssistantAfterLastUser(messages)).toBeNull();
	});
});
