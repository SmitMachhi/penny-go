import type { ActiveRunProgress, ActiveTurn } from '$lib/chat/client-api.js';
import {
	appendUserMessage,
	startRunState,
	type ChatClientState
} from '$lib/chat/client-state.js';
import { countUserMessages } from '$lib/chat/client-thread-reconcile.js';
import type { ChatMessage } from '$lib/chat/messages.js';

export function shouldApplyBootstrapMessages(input: {
	localUserCount: number;
	remoteUserCount: number;
	hasActiveTurn: boolean;
}): boolean {
	if (input.hasActiveTurn) {
		return true;
	}
	if (input.localUserCount > input.remoteUserCount) {
		return true;
	}
	return input.localUserCount <= input.remoteUserCount;
}

function hasUserMessage(messages: readonly ChatMessage[], text: string): boolean {
	const trimmed = text.trim();
	return messages.some((message) => message.role === 'user' && message.text.trim() === trimmed);
}

export function reconcileActiveTurnFromHistory(
	state: ChatClientState,
	activeTurn: ActiveTurn,
	activeRunProgress: ActiveRunProgress | null
): number {
	if (!hasUserMessage(state.messages, activeTurn.message)) {
		appendUserMessage(state, activeTurn.message);
	}
	if (!state.sending) {
		startRunState(state);
	}
	if (activeRunProgress) {
		hydrateActiveRunProgress(state, activeRunProgress);
	}
	return countUserMessages(state.messages);
}

export function hydrateActiveRunProgress(
	state: ChatClientState,
	progress: ActiveRunProgress
): void {
	state.tools = [...progress.tools];
	state.runTrace = {
		segments: [...progress.runTrace.segments],
		liveSegment: progress.runTrace.liveSegment
	};
	state.streamingAnswerText = progress.streamingAnswerText;
}
