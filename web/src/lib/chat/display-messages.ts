import type { ChatMessage } from '$lib/chat/messages.js';
import { sanitizeAssistantDisplayText } from '$lib/chat/sanitize-assistant-text.js';

export function findLastUserMessageIndex(messages: readonly ChatMessage[]): number {
	for (let index = messages.length - 1; index >= 0; index -= 1) {
		if (messages[index]?.role === 'user') {
			return index;
		}
	}
	return -1;
}

export function findLastAssistantMessageId(messages: readonly ChatMessage[]): string | null {
	for (let index = messages.length - 1; index >= 0; index -= 1) {
		const message = messages[index];
		if (message?.role === 'assistant') {
			return message.id;
		}
	}
	return null;
}

function sanitizeMessageForDisplay(message: ChatMessage): ChatMessage {
	if (message.role !== 'assistant') {
		return message;
	}
	const text = sanitizeAssistantDisplayText(message.text);
	if (text === message.text) {
		return message;
	}
	return { ...message, text };
}

/** Hide gateway-persisted assistant partials while a run is still streaming live. */
export function messagesForDisplay(
	messages: readonly ChatMessage[],
	sending: boolean
): ChatMessage[] {
	const sanitized = messages.map(sanitizeMessageForDisplay);

	if (!sending) {
		return sanitized;
	}

	const lastUserIndex = findLastUserMessageIndex(sanitized);
	if (lastUserIndex === -1) {
		return sanitized;
	}

	return sanitized.slice(0, lastUserIndex + 1);
}

export function stripTrailingAssistantMessages(messages: ChatMessage[]): ChatMessage[] {
	const lastUserIndex = findLastUserMessageIndex(messages);
	if (lastUserIndex === -1) {
		return messages;
	}

	return messages.slice(0, lastUserIndex + 1);
}
