import { patchPennyTurn, type PennyTurn } from '$lib/server/penny-turn-store.js';

const MINUTE_MS = 60_000;

/** No gateway progress for this long → turn is wedged, not a live 30-min research run. */
export const ACTIVE_TURN_STALE_MS = 45 * MINUTE_MS;

const ACTIVE_TURN_STATUSES = new Set<PennyTurn['status']>(['pending', 'submitted', 'running']);

export const ACTIVE_TURN_IN_FLIGHT_MESSAGE = 'Penny is still working on your previous message';
export const ACTIVE_TURN_STALE_ERROR = 'turn timed out without reply';

export function isActivePennyTurnStatus(status: PennyTurn['status']): boolean {
	return ACTIVE_TURN_STATUSES.has(status);
}

export async function expireStaleActiveTurnIfNeeded(
	turn: PennyTurn,
	now: number
): Promise<PennyTurn | null> {
	if (!isActivePennyTurnStatus(turn.status)) {
		return turn;
	}
	if (now - turn.updatedAt < ACTIVE_TURN_STALE_MS) {
		return turn;
	}
	return patchPennyTurn(turn.sessionKey, turn.turnId, {
		status: 'failed',
		error: ACTIVE_TURN_STALE_ERROR,
		updatedAt: now
	});
}
