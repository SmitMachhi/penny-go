import { randomUUID } from 'node:crypto';

import { ValidationError } from '$lib/server/api-error.js';
import { sendChatMessage } from '$lib/server/gateway-chat-service.js';
import {
	patchPennyTurn,
	readPennyTurn,
	upsertPennyTurn,
	type PennyTurn
} from '$lib/server/penny-turn-store.js';
import { resolveSessionKey } from '$lib/server/session-key.js';

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
