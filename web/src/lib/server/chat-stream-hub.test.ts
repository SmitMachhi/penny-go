import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChatEventPayload } from '$lib/gateway/types.js';

type GatewayEventBusOptions = {
	onEvent: (event: string, payload: unknown) => void;
	shouldReconnect: () => boolean;
};

const gatewayEventBus = vi.hoisted(() => ({
	options: null as GatewayEventBusOptions | null
}));

vi.mock('$lib/server/gateway-events-service.js', () => ({
	ensureGatewayEventBus: (options: GatewayEventBusOptions) => {
		gatewayEventBus.options = options;
	}
}));

import { readPennyTurn, upsertPennyTurn } from './penny-turn-store.js';
import { subscribeToStream } from './chat-stream-hub.js';

const SESSION_KEY = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440001';
const TURN_ID = 'turn-1';
const RUN_ID = 'run-1';
const CREATED_AT = 1_000;

describe('chat stream hub turn state', () => {
	let repoRoot = '';
	let previousRepoRoot: string | undefined;

	beforeEach(async () => {
		previousRepoRoot = process.env.PENNY_REPO_ROOT;
		repoRoot = await mkdtemp(join(tmpdir(), 'penny-chat-stream-hub-'));
		process.env.PENNY_REPO_ROOT = repoRoot;
		gatewayEventBus.options = null;
	});

	afterEach(async () => {
		if (previousRepoRoot === undefined) {
			delete process.env.PENNY_REPO_ROOT;
		} else {
			process.env.PENNY_REPO_ROOT = previousRepoRoot;
		}
		await rm(repoRoot, { recursive: true, force: true });
	});

	it('marks the matching turn completed when a final event arrives', async () => {
		await upsertPennyTurn({
			turnId: TURN_ID,
			sessionKey: SESSION_KEY,
			message: 'hello penny',
			status: 'submitted',
			runId: RUN_ID,
			createdAt: CREATED_AT,
			updatedAt: CREATED_AT
		});
		const unsubscribe = subscribeToStream(SESSION_KEY, () => {});
		const event: ChatEventPayload = {
			sessionKey: SESSION_KEY,
			runId: RUN_ID,
			state: 'final',
			message: { role: 'assistant', text: 'answer' }
		};

		gatewayEventBus.options?.onEvent('chat', event);

		await expect
			.poll(async () => (await readPennyTurn(SESSION_KEY, TURN_ID))?.status)
			.toBe('completed');
		expect(await readPennyTurn(SESSION_KEY, TURN_ID)).toMatchObject({ runId: RUN_ID });
		unsubscribe();
	});
});
