import type { ChatMessage } from '$lib/chat/messages.js';
import { findLastUserMessageIndex } from '$lib/chat/display-messages.js';

export const RUN_RECOVERY_POLL_MS = 15_000;

export function findCompletedAssistantAfterLastUser(
	messages: readonly ChatMessage[]
): ChatMessage | null {
	const lastUserIndex = findLastUserMessageIndex(messages);
	if (lastUserIndex === -1) {
		return null;
	}

	for (let index = lastUserIndex + 1; index < messages.length; index += 1) {
		const message = messages[index];
		if (message?.role === 'assistant' && message.phase !== 'commentary' && message.text.trim()) {
			return message;
		}
	}

	return null;
}
