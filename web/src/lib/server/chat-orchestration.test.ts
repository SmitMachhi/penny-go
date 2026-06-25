import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { sendChatMessage } = vi.hoisted(() => ({
	sendChatMessage: vi.fn()
}));

vi.mock('$lib/server/gateway-chat-service.js', () => ({
	abortChatRun: vi.fn(),
	fetchChatHistory: vi.fn(),
	sendChatMessage
}));

import { sendChat } from './chat-orchestration.js';
import type { PennySessionOwnershipStore } from './penny-session-ownership.js';

const SESSION_KEY = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440001';
const SESSION_ID = 'session-1';
const TURN_ID = 'turn-1';
const RUN_ID = 'run-1';
const MESSAGE = 'hello penny';

describe('chat orchestration', () => {
	let repoRoot = '';
	let previousRepoRoot: string | undefined;

	beforeEach(async () => {
		previousRepoRoot = process.env.PENNY_REPO_ROOT;
		repoRoot = await mkdtemp(join(tmpdir(), 'penny-chat-orchestration-'));
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

	it('submits chat through a backend turn idempotency key', async () => {
		const response = await sendChat({
			message: MESSAGE,
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
		expect(response).toMatchObject({
			runId: RUN_ID,
			sessionKey: SESSION_KEY,
			turn: { runId: RUN_ID, turnId: TURN_ID }
		});
	});

	it('rejects chat submission before OpenClaw when the session is unavailable', async () => {
		const ownershipStore: PennySessionOwnershipStore = {
			hasSession: vi.fn().mockResolvedValue(false)
		};

		await expect(
			sendChat({
				message: MESSAGE,
				ownershipStore,
				sessionId: SESSION_ID,
				sessionKey: SESSION_KEY,
				turnId: TURN_ID
			})
		).rejects.toThrow('session is not available');

		expect(sendChatMessage).not.toHaveBeenCalled();
	});
});
