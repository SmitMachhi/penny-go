import { beforeEach, describe, expect, it, vi } from 'vitest';

const { listGatewaySessions, createGatewaySession, fetchChatHistory } = vi.hoisted(() => ({
	listGatewaySessions: vi.fn(),
	createGatewaySession: vi.fn(),
	fetchChatHistory: vi.fn()
}));

vi.mock('$lib/server/gateway-session-service.js', () => ({
	listGatewaySessions,
	createGatewaySession,
	deleteGatewaySession: vi.fn(),
	patchGatewaySession: vi.fn()
}));

vi.mock('$lib/server/gateway-chat-service.js', () => ({
	fetchChatHistory
}));

import {
	createPennySession,
	listPennySessions
} from './session-service.js';
import { LEGACY_SESSION_KEY } from './session-key.js';

describe('session service', () => {
	beforeEach(() => {
		listGatewaySessions.mockReset();
		createGatewaySession.mockReset();
		fetchChatHistory.mockReset();
	});

	it('lists penny sessions sorted by updatedAt', async () => {
		listGatewaySessions.mockResolvedValueOnce([
			{
				key: 'agent:main:penny:550e8400-e29b-41d4-a716-446655440001',
				updatedAt: 100,
				derivedTitle: 'Older chat'
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
	});

	it('includes legacy session once when no penny sessions exist', async () => {
		listGatewaySessions.mockResolvedValueOnce([
			{ key: LEGACY_SESSION_KEY, updatedAt: 100, derivedTitle: 'Old main' }
		]);
		fetchChatHistory.mockResolvedValueOnce({ messages: [{ role: 'user', text: 'hello' }] });

		const sessions = await listPennySessions();
		expect(sessions).toHaveLength(1);
		expect(sessions[0]?.key).toBe(LEGACY_SESSION_KEY);
		expect(sessions[0]?.title).toBe('Previous chat');
		expect(sessions[0]?.isLegacy).toBe(true);
	});

	it('creates penny session with generated key', async () => {
		createGatewaySession.mockResolvedValueOnce(undefined);

		const session = await createPennySession('Ontario SaaS');
		expect(session.title).toBe('Ontario SaaS');
		expect(session.key.startsWith('agent:main:penny:')).toBe(true);
		expect(createGatewaySession).toHaveBeenCalledWith(
			expect.objectContaining({
				key: session.key,
				label: 'Ontario SaaS'
			})
		);
	});
});
