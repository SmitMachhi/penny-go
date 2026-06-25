import type { ActiveRunProgress, ActiveTurn } from '$lib/chat/client-api.js';
import {
	appendUserMessage,
	startRunState,
	type ChatClientState
} from '$lib/chat/client-state.js';
import { countUserMessages } from '$lib/chat/client-thread-reconcile.js';

export function shouldApplyBootstrapMessages(input: {
	localUserCount: number;
	remoteUserCount: number;
	hasActiveTurn: boolean;
}): boolean {
	return input.hasActiveTurn || input.localUserCount <= input.remoteUserCount;
}

export function reconcileActiveTurnFromHistory(
	state: ChatClientState,
	activeTurn: ActiveTurn,
	activeRunProgress: ActiveRunProgress | null
): number {
	const lastMessage = state.messages.at(-1);
	if (lastMessage?.role !== 'user' || lastMessage.text !== activeTurn.message) {
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
