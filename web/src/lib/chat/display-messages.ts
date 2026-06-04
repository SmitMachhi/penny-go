import type { ChatMessage } from '$lib/chat/messages.js';

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

/** Hide gateway-persisted assistant partials while a run is still streaming live. */
export function messagesForDisplay(
	messages: readonly ChatMessage[],
	sending: boolean
): ChatMessage[] {
	if (!sending) {
		return [...messages];
	}

	const lastUserIndex = findLastUserMessageIndex(messages);
	if (lastUserIndex === -1) {
		return [...messages];
	}

	return messages.slice(0, lastUserIndex + 1);
}

export function stripTrailingAssistantMessages(messages: ChatMessage[]): ChatMessage[] {
	const lastUserIndex = findLastUserMessageIndex(messages);
	if (lastUserIndex === -1) {
		return messages;
	}

	return messages.slice(0, lastUserIndex + 1);
}
