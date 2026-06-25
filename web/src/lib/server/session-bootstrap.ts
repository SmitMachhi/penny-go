import { randomUUID } from 'node:crypto';

import { normalizeHistoryMessages } from '$lib/chat/messages.js';
import type { ChatMessage } from '$lib/chat/messages.js';
import {
	CHAT_HISTORY_LIMIT,
	CHAT_HISTORY_MAX_CHARS
} from '$lib/server/chat-history-config.js';
import { fetchChatHistory } from '$lib/server/gateway-chat-service.js';
import { listSessionArtifactSummaries } from '$lib/server/artifact-storage.js';
import { readPennySessionIndex } from '$lib/server/penny-session-index.js';
import { resolveSessionKey } from '$lib/server/session-key.js';
import { reconcileActivePennyTurn } from '$lib/server/penny-turn-service.js';
import { readPennyTurns, type PennyTurn } from '$lib/server/penny-turn-store.js';
import {
	buildFundingCheckpointAnswer,
	extractLatestUserText,
	extractVerifiedFundingEvidence,
	hasCompletedAssistantAfterLastUser
} from '$lib/server/funding-evidence-recovery.js';
import {
	extractActiveRunProgress,
	mergeMessagesForActiveTurn,
	type ActiveRunProgress
} from '$lib/server/run-progress-from-history.js';

function latestInterruptedTurn(turns: readonly PennyTurn[]): PennyTurn | null {
	for (let index = turns.length - 1; index >= 0; index -= 1) {
		const turn = turns[index];
		if (turn?.status === 'aborted' || turn?.status === 'failed') {
			return turn;
		}
	}
	return null;
}

function appendCheckpointIfNeeded(input: {
	messages: ChatMessage[];
	rawMessages: readonly unknown[];
	turn: PennyTurn | null;
}): ChatMessage[] {
	if (!input.turn || hasCompletedAssistantAfterLastUser(input.messages)) {
		return input.messages;
	}
	const userText = extractLatestUserText(input.rawMessages) ?? input.turn.message;
	const answer = buildFundingCheckpointAnswer({
		userText,
		evidence: extractVerifiedFundingEvidence(input.rawMessages)
	});
	if (!answer) {
		return input.messages;
	}
	return [
		...input.messages,
		{
			id: `recovery-${randomUUID()}`,
			role: 'assistant',
			text: answer
		}
	];
}

function resolveActiveRunProgress(
	rawMessages: readonly unknown[],
	activeTurn: PennyTurn
): ActiveRunProgress | null {
	return extractActiveRunProgress(rawMessages, activeTurn.message);
}

export async function getSessionBootstrap(sessionKeyRaw: string | null | undefined) {
	const sessionKey = resolveSessionKey(sessionKeyRaw);
	const [index, history, artifacts, turns] = await Promise.all([
		readPennySessionIndex(),
		fetchChatHistory({
			sessionKey,
			limit: CHAT_HISTORY_LIMIT,
			maxChars: CHAT_HISTORY_MAX_CHARS
		}),
		listSessionArtifactSummaries(sessionKey),
		readPennyTurns(sessionKey)
	]);
	const baseMessages = normalizeHistoryMessages(history.messages);
	const activeTurn = await reconcileActivePennyTurn({ sessionKey, messages: baseMessages });
	const activeRunProgress = activeTurn
		? resolveActiveRunProgress(history.messages, activeTurn)
		: null;
	const messages = activeTurn
		? mergeMessagesForActiveTurn(baseMessages, activeTurn.message, activeRunProgress)
		: appendCheckpointIfNeeded({
				messages: baseMessages,
				rawMessages: history.messages,
				turn: latestInterruptedTurn(turns)
			});
	return {
		session: index.find((entry) => entry.key === sessionKey) ?? null,
		sessionKey: history.sessionKey,
		sessionId: history.sessionId,
		messages,
		artifacts,
		activeTurn,
		activeRunProgress
	};
}

export type { ActiveRunProgress };
