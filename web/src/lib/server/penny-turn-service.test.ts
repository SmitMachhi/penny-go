import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { sendChatMessage } = vi.hoisted(() => ({
	sendChatMessage: vi.fn()
}));

vi.mock('$lib/server/gateway-chat-service.js', () => ({
	sendChatMessage
}));

import { readPennyTurn, upsertPennyTurn } from './penny-turn-store.js';
import {
	reconcileActivePennyTurn,
	recordPennyTurnRunEvent,
	submitPennyTurn
} from './penny-turn-service.js';
import { ACTIVE_TURN_IN_FLIGHT_MESSAGE, ACTIVE_TURN_STALE_MS } from './penny-turn-lifecycle.js';

const SESSION_KEY = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440001';
const SESSION_ID = 'session-1';
const TURN_ID = 'turn-1';
const RUN_ID = 'run-1';
const CREATED_AT = 1_000;
const MESSAGE = 'hello penny';

describe('penny turn service', () => {
	let repoRoot = '';
	let previousRepoRoot: string | undefined;

	beforeEach(async () => {
		previousRepoRoot = process.env.PENNY_REPO_ROOT;
		repoRoot = await mkdtemp(join(tmpdir(), 'penny-turn-service-'));
		process.env.PENNY_REPO_ROOT = repoRoot;
		sendChatMessage.mockReset();
		sendChatMessage.mockResolvedValue({ runId: RUN_ID, sessionKey: SESSION_KEY });
	});

	afterEach(async () => {
		if (previousRepoRoot === undefined) {
			delete process.env.PENNY_REPO_ROOT;
		} else {
			process.env.PENNY_REPO_ROOT = previousRepoRoot;
		}
		await rm(repoRoot, { recursive: true, force: true });
	});

	it('submits a turn with the turn id as OpenClaw idempotency key', async () => {
		const result = await submitPennyTurn({
			message: MESSAGE,
			now: CREATED_AT,
			sessionId: SESSION_ID,
			sessionKey: SESSION_KEY,
			turnId: TURN_ID
		});

		expect(sendChatMessage).toHaveBeenCalledWith({
			deliver: false,
			idempotencyKey: TURN_ID,
			message: MESSAGE,
			sessionId: SESSION_ID,
			sessionKey: SESSION_KEY
		});
		expect(result.runId).toBe(RUN_ID);
		expect(await readPennyTurn(SESSION_KEY, TURN_ID)).toMatchObject({
			message: MESSAGE,
			runId: RUN_ID,
			status: 'submitted',
			turnId: TURN_ID
		});
	});

	it('returns the existing submitted turn without sending again', async () => {
		await submitPennyTurn({
			message: MESSAGE,
			now: CREATED_AT,
			sessionKey: SESSION_KEY,
			turnId: TURN_ID
		});
		sendChatMessage.mockClear();

		const result = await submitPennyTurn({
			message: MESSAGE,
			now: CREATED_AT,
			sessionKey: SESSION_KEY,
			turnId: TURN_ID
		});

		expect(sendChatMessage).not.toHaveBeenCalled();
		expect(result.runId).toBe(RUN_ID);
	});

	it('rejects turn id reuse with different message text', async () => {
		await submitPennyTurn({
			message: MESSAGE,
			now: CREATED_AT,
			sessionKey: SESSION_KEY,
			turnId: TURN_ID
		});

		await expect(
			submitPennyTurn({
				message: 'different text',
				now: CREATED_AT,
				sessionKey: SESSION_KEY,
				turnId: TURN_ID
			})
		).rejects.toThrow('turnId already belongs to a different message');
	});

	it('marks a submitted turn completed from its final run event', async () => {
		await submitPennyTurn({
			message: MESSAGE,
			now: CREATED_AT,
			sessionKey: SESSION_KEY,
			turnId: TURN_ID
		});

		await recordPennyTurnRunEvent({
			runId: RUN_ID,
			sessionKey: SESSION_KEY,
			status: 'completed',
			updatedAt: CREATED_AT
		});

		expect(await readPennyTurn(SESSION_KEY, TURN_ID)).toMatchObject({
			runId: RUN_ID,
			status: 'completed'
		});
	});

	it('reconciles submitted turns against loaded history', async () => {
		await submitPennyTurn({
			message: MESSAGE,
			now: CREATED_AT,
			sessionKey: SESSION_KEY,
			turnId: TURN_ID
		});

		const activeBeforeReply = await reconcileActivePennyTurn({
			messages: [{ id: 'history-0', role: 'user', text: MESSAGE }],
			sessionKey: SESSION_KEY,
			updatedAt: CREATED_AT
		});
		expect(activeBeforeReply?.turnId).toBe(TURN_ID);

		const activeAfterReply = await reconcileActivePennyTurn({
			messages: [
				{ id: 'history-0', role: 'user', text: MESSAGE },
				{ id: 'history-1', role: 'assistant', text: 'answer' }
			],
			sessionKey: SESSION_KEY,
			updatedAt: CREATED_AT
		});

		expect(activeAfterReply).toBeNull();
		expect(await readPennyTurn(SESSION_KEY, TURN_ID)).toMatchObject({ status: 'completed' });
	});

	it('rejects a new turn while another turn is still active', async () => {
		await submitPennyTurn({
			message: MESSAGE,
			now: CREATED_AT,
			sessionKey: SESSION_KEY,
			turnId: TURN_ID
		});

		await expect(
			submitPennyTurn({
				message: 'follow up',
				now: CREATED_AT + 1,
				sessionKey: SESSION_KEY,
				turnId: 'turn-2'
			})
		).rejects.toThrow(ACTIVE_TURN_IN_FLIGHT_MESSAGE);
	});

	it('expires stale active turns during reconciliation', async () => {
		const staleUpdatedAt = CREATED_AT - ACTIVE_TURN_STALE_MS - 1;
		await upsertPennyTurn({
			turnId: TURN_ID,
			sessionKey: SESSION_KEY,
			message: MESSAGE,
			status: 'running',
			runId: RUN_ID,
			createdAt: staleUpdatedAt,
			updatedAt: staleUpdatedAt
		});

		await expect(
			reconcileActivePennyTurn({
				messages: [{ id: 'history-0', role: 'user', text: MESSAGE }],
				sessionKey: SESSION_KEY,
				updatedAt: CREATED_AT
			})
		).resolves.toBeNull();

		expect(await readPennyTurn(SESSION_KEY, TURN_ID)).toMatchObject({ status: 'failed' });
	});
});
