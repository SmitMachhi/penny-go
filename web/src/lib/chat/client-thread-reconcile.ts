import type { ChatMessage } from '$lib/chat/messages.js';

import { findCompletedAssistantAfterLastUser } from './client-run-recovery.js';
import { findLastUserMessageIndex } from './display-messages.js';

export function countUserMessages(messages: readonly ChatMessage[]): number {
	return messages.filter((entry) => entry.role === 'user').length;
}

/** Last turn has a user message but no completed assistant reply after it. */
export function hasPendingReply(messages: readonly ChatMessage[]): boolean {
	return findLastUserMessageIndex(messages) !== -1 && findCompletedAssistantAfterLastUser(messages) === null;
}
