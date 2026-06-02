import { describe, expect, it } from 'vitest';

import { messagesForDisplay, stripTrailingAssistantMessages } from './display-messages.js';
import type { ChatMessage } from './messages.js';

const USER: ChatMessage = { id: 'u1', role: 'user', text: 'Fund my project' };
const ASSISTANT: ChatMessage = { id: 'a1', role: 'assistant', text: 'Partial reply' };

describe('display-messages', () => {
	it('hides assistant messages after the latest user while sending', () => {
		const messages = [USER, ASSISTANT];

		expect(messagesForDisplay(messages, true)).toEqual([USER]);
		expect(messagesForDisplay(messages, false)).toEqual(messages);
	});

	it('strips trailing assistant messages before finalizing a run', () => {
		expect(stripTrailingAssistantMessages([USER, ASSISTANT])).toEqual([USER]);
	});
});
