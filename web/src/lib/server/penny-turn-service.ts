import { randomUUID } from 'node:crypto';

import { ConflictError, ValidationError } from '$lib/server/api-error.js';
import { sendChatMessage } from '$lib/server/gateway-chat-service.js';
import {
	ACTIVE_TURN_IN_FLIGHT_MESSAGE,
	expireStaleActiveTurnIfNeeded,
	isActivePennyTurnStatus
} from '$lib/server/penny-turn-lifecycle.js';
import {
	patchPennyTurn,
	readPennyTurn,
	readPennyTurns,
	upsertPennyTurn,
	type PennyTurn
} from '$lib/server/penny-turn-store.js';
import { resolveSessionKey } from '$lib/server/session-key.js';
import type { ChatMessage } from '$lib/chat/messages.js';

type SubmitPennyTurnInput = {
	message?: string;
	sessionId?: string | null;
	sessionKey?: string;
	turnId?: string;
	now?: number;
};

type SubmitPennyTurnResult = {
	runId: string;
	sessionKey: string;
	turn: PennyTurn;
};

type RecordPennyTurnRunEventInput = {
	error?: string;
	runId: string;
	sessionKey: string;
	status: Extract<PennyTurn['status'], 'running' | 'completed' | 'failed' | 'aborted'>;
	updatedAt?: number;
};

type ReconcileActivePennyTurnInput = {
	messages: ChatMessage[];
	sessionKey: string;
	updatedAt?: number;
};

const CHAT_DELIVER = false;
const MAX_TURN_ID_LENGTH = 128;
const TURN_ID_PATTERN = /^[A-Za-z0-9._:-]+$/;

function normalizeTurnId(candidate: string | undefined): string {
	const turnId = candidate?.trim() || randomUUID();
	if (turnId.length > MAX_TURN_ID_LENGTH || !TURN_ID_PATTERN.test(turnId)) {
		throw new ValidationError('turnId is invalid');
	}
	return turnId;
}

function normalizeMessage(candidate: string | undefined): string {
	const message = candidate?.trim();
	if (!message) {
		throw new ValidationError('message is required');
	}
	return message;
}

function assertMessageMatchesTurn(turn: PennyTurn, message: string): void {
	if (turn.message !== message) {
		throw new ValidationError('turnId already belongs to a different message');
	}
}

export async function submitPennyTurn(
	input: SubmitPennyTurnInput
): Promise<SubmitPennyTurnResult> {
	const sessionKey = resolveSessionKey(input.sessionKey);
	const message = normalizeMessage(input.message);
	const turnId = normalizeTurnId(input.turnId);
	const now = input.now ?? Date.now();
	await assertNoConflictingActiveTurn(sessionKey, turnId, now);
	const existing = await readPennyTurn(sessionKey, turnId);

	if (existing?.runId) {
		assertMessageMatchesTurn(existing, message);
		return { runId: existing.runId, sessionKey, turn: existing };
	}
	if (existing) {
		assertMessageMatchesTurn(existing, message);
	}

	const pendingTurn =
		existing ??
		(await upsertPennyTurn({
			turnId,
			sessionKey,
			message,
			status: 'pending',
			runId: null,
			createdAt: now,
			updatedAt: now
		}));

	try {
		const response = await sendChatMessage({
			message,
			sessionKey,
			...(input.sessionId ? { sessionId: input.sessionId } : {}),
			deliver: CHAT_DELIVER,
			idempotencyKey: turnId
		});
		const turn =
			(await patchPennyTurn(sessionKey, turnId, {
				status: 'submitted',
				runId: response.runId,
				updatedAt: now
			})) ?? pendingTurn;
		return { runId: response.runId, sessionKey, turn };
	} catch (error) {
		await patchPennyTurn(sessionKey, turnId, {
			status: 'failed',
			error: error instanceof Error ? error.message : 'turn submission failed',
			updatedAt: now
		});
		throw error;
	}
}

async function assertNoConflictingActiveTurn(
	sessionKey: string,
	turnId: string,
	now: number
): Promise<void> {
	const activeTurn = await resolveLatestActiveTurn(sessionKey, now);
	if (activeTurn && activeTurn.turnId !== turnId) {
		throw new ConflictError(ACTIVE_TURN_IN_FLIGHT_MESSAGE);
	}
}

async function resolveLatestActiveTurn(
	sessionKey: string,
	now: number
): Promise<PennyTurn | null> {
	let activeTurn = findLatestActiveTurn(await readPennyTurns(sessionKey));
	if (!activeTurn) {
		return null;
	}
	const reconciled = await expireStaleActiveTurnIfNeeded(activeTurn, now);
	if (!reconciled || !isActivePennyTurnStatus(reconciled.status)) {
		return findLatestActiveTurn(await readPennyTurns(sessionKey));
	}
	return reconciled;
}

function findLatestActiveTurn(turns: readonly PennyTurn[]): PennyTurn | null {
	for (let index = turns.length - 1; index >= 0; index -= 1) {
		const turn = turns[index];
		if (turn && isActivePennyTurnStatus(turn.status)) {
			return turn;
		}
	}
	return null;
}

function turnHasAssistantReply(turn: PennyTurn, messages: readonly ChatMessage[]): boolean {
	for (let index = messages.length - 1; index >= 0; index -= 1) {
		const message = messages[index];
		if (message?.role !== 'user' || message.text.trim() !== turn.message) {
			continue;
		}
		return messages.slice(index + 1).some((entry) => entry.role === 'assistant' && entry.text.trim());
	}
	return false;
}

export async function recordPennyTurnRunEvent(
	input: RecordPennyTurnRunEventInput
): Promise<PennyTurn | null> {
	const sessionKey = resolveSessionKey(input.sessionKey);
	const turns = await readPennyTurns(sessionKey);
	const turn = turns.find((entry) => entry.runId === input.runId || entry.turnId === input.runId);
	if (!turn) {
		return null;
	}
	return patchPennyTurn(sessionKey, turn.turnId, {
		status: input.status,
		runId: input.runId,
		updatedAt: input.updatedAt ?? Date.now(),
		...(input.error ? { error: input.error } : {})
	});
}

export async function reconcileActivePennyTurn(
	input: ReconcileActivePennyTurnInput
): Promise<PennyTurn | null> {
	const sessionKey = resolveSessionKey(input.sessionKey);
	const now = input.updatedAt ?? Date.now();
	const activeTurn = await resolveLatestActiveTurn(sessionKey, now);
	if (!activeTurn) {
		return null;
	}
	if (turnHasAssistantReply(activeTurn, input.messages)) {
		await patchPennyTurn(sessionKey, activeTurn.turnId, {
			status: 'completed',
			updatedAt: input.updatedAt ?? Date.now()
		});
		return null;
	}
	if (activeTurn.status !== 'running') {
		return patchPennyTurn(sessionKey, activeTurn.turnId, {
			status: 'running',
			updatedAt: input.updatedAt ?? Date.now()
		});
	}
	return activeTurn;
}
