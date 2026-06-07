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

import { readPennyTurn } from './penny-turn-store.js';
import { submitPennyTurn } from './penny-turn-service.js';

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
});
