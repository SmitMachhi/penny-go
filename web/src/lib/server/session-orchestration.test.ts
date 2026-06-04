import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { listGatewaySessions, createGatewaySession, fetchChatHistory, patchGatewaySession } =
	vi.hoisted(() => ({
		listGatewaySessions: vi.fn(),
		createGatewaySession: vi.fn(),
		fetchChatHistory: vi.fn(),
		patchGatewaySession: vi.fn()
	}));

vi.mock('$lib/server/gateway-session-service.js', () => ({
	listGatewaySessions,
	createGatewaySession,
	deleteGatewaySession: vi.fn(),
	patchGatewaySession
}));

vi.mock('$lib/server/gateway-chat-service.js', () => ({
	fetchChatHistory
}));

import { titleFromFirstMessage } from '@penny/shared/session-title';

import {
	createPennySession,
	generatePennySessionTitle,
	listPennySessions
} from './session-orchestration.js';
import { LEGACY_SESSION_KEY } from './session-key.js';

describe('session orchestration', () => {
	let repoRoot = '';
	let previousRepoRoot: string | undefined;

	beforeEach(async () => {
		previousRepoRoot = process.env.PENNY_REPO_ROOT;
		repoRoot = await mkdtemp(join(tmpdir(), 'penny-session-orchestration-'));
		process.env.PENNY_REPO_ROOT = repoRoot;
		listGatewaySessions.mockReset();
		createGatewaySession.mockReset();
		fetchChatHistory.mockReset();
		patchGatewaySession.mockReset();
	});

	afterEach(async () => {
		if (previousRepoRoot === undefined) {
			delete process.env.PENNY_REPO_ROOT;
		} else {
			process.env.PENNY_REPO_ROOT = previousRepoRoot;
		}
		await rm(repoRoot, { recursive: true, force: true });
	});

	it('lists penny sessions sorted by updatedAt', async () => {
		listGatewaySessions.mockResolvedValueOnce([
			{
				key: 'agent:main:penny:550e8400-e29b-41d4-a716-446655440001',
				updatedAt: 100,
				label: 'Older chat'
			},
			{
				key: 'agent:main:penny:550e8400-e29b-41d4-a716-446655440002',
				updatedAt: 200,
				label: 'Newer chat'
			},
			{ key: LEGACY_SESSION_KEY, updatedAt: 300 }
		]);

		const sessions = await listPennySessions();
		expect(sessions.map((session) => session.key)).toEqual([
			'agent:main:penny:550e8400-e29b-41d4-a716-446655440002',
			'agent:main:penny:550e8400-e29b-41d4-a716-446655440001'
		]);
		expect(sessions[0]?.title).toBe('Newer chat');
		expect(sessions[0]?.titleStatus).toBe('ready');
	});

	it('uses New chat for unlabeled sessions', async () => {
		listGatewaySessions.mockResolvedValueOnce([
			{
				key: 'agent:main:penny:550e8400-e29b-41d4-a716-446655440001',
				updatedAt: 100
			}
		]);

		const sessions = await listPennySessions();
		expect(sessions[0]?.title).toBe('New chat');
		expect(sessions[0]?.titleStatus).toBe('ready');
	});

	it('includes legacy session once when no penny sessions exist', async () => {
		listGatewaySessions.mockResolvedValueOnce([
			{ key: LEGACY_SESSION_KEY, updatedAt: 100, label: 'Old main' }
		]);
		fetchChatHistory.mockResolvedValueOnce({ messages: [{ role: 'user', text: 'hello' }] });

		const sessions = await listPennySessions();
		expect(sessions).toHaveLength(1);
		expect(sessions[0]?.key).toBe(LEGACY_SESSION_KEY);
		expect(sessions[0]?.title).toBe('Previous chat');
		expect(sessions[0]?.isLegacy).toBe(true);
	});

	it('skips title generation when no first message is available yet', async () => {
		const sessionKey = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440001';
		listGatewaySessions.mockResolvedValueOnce([{ key: sessionKey, updatedAt: 100 }]);
		fetchChatHistory.mockResolvedValueOnce({ messages: [] });

		const session = await generatePennySessionTitle(sessionKey);
		expect(session.title).toBe('New chat');
		expect(session.titleStatus).toBe('ready');
		expect(patchGatewaySession).not.toHaveBeenCalled();
	});

	it('skips title generation when the first message is only metadata', async () => {
		const sessionKey = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440001';
		const metadataOnlyMessage =
			'Sender (untrusted metadata):\n```json\n{"label":"ui"}\n```';
		listGatewaySessions.mockResolvedValueOnce([{ key: sessionKey, updatedAt: 100 }]);
		patchGatewaySession.mockResolvedValueOnce(undefined);

		const session = await generatePennySessionTitle(sessionKey, metadataOnlyMessage);

		expect(session.title).toBe('New chat');
		expect(session.titleStatus).toBe('ready');
		expect(patchGatewaySession).not.toHaveBeenCalled();
	});

	it('stores the first user message as the session title', async () => {
		const sessionKey = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440001';
		listGatewaySessions.mockResolvedValue([{ key: sessionKey, updatedAt: 100 }]);
		patchGatewaySession.mockResolvedValueOnce(undefined);

		const firstMessage = 'Tell me about Ontario SaaS grants for my dairy business';
		const session = await generatePennySessionTitle(sessionKey, firstMessage);
		const title = titleFromFirstMessage(firstMessage);
		expect(session.title).toBe(title);
		expect(session.titleStatus).toBe('ready');
		expect(patchGatewaySession).toHaveBeenCalledWith({
			key: sessionKey,
			label: title
		});
	});

	it('creates penny session with generated key', async () => {
		createGatewaySession.mockResolvedValueOnce(undefined);

		const session = await createPennySession('Ontario SaaS');
		expect(session.title).toBe('Ontario SaaS');
		expect(session.titleStatus).toBe('ready');
		expect(session.key.startsWith('agent:main:penny:')).toBe(true);
		expect(createGatewaySession).toHaveBeenCalledWith(
			expect.objectContaining({
				key: session.key,
				agentId: 'main',
				label: 'Ontario SaaS'
			})
		);
	});
});
