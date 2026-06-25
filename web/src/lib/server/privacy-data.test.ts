import { describe, expect, it, vi } from 'vitest';

import type { PennySessionOwnershipRegistry } from './penny-session-ownership.js';
import type { PennySessionView } from '$lib/types/penny-session.js';
import {
	deletePennyPrivacyData,
	exportPennyPrivacyData
} from './privacy-data.js';

const SESSION_KEY = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440000';
const USER_ID = 'user-1';
const NOW = new Date('2026-06-25T18:00:00.000Z');

const SESSION: PennySessionView = {
	isLegacy: false,
	key: SESSION_KEY,
	title: 'Ontario SaaS',
	titleStatus: 'ready',
	updatedAt: 1_772_000_000_000
};

function registryWithSessions(sessions: PennySessionView[]): PennySessionOwnershipRegistry {
	return {
		createSession: vi.fn(),
		deleteSession: vi.fn(),
		hasSession: vi.fn(async (sessionKey) => sessions.some((session) => session.key === sessionKey)),
		listSessions: vi.fn(async () => sessions),
		updateSession: vi.fn()
	};
}

describe('privacy data service', () => {
	it('exports owned sessions with history, artifacts, and turn ledgers', async () => {
		const registry = registryWithSessions([SESSION]);
		const historyReader = vi.fn(async () => ({
			messages: [{ id: 'm1', role: 'user' as const, text: 'hello' }],
			sessionId: 'gateway-session-1',
			sessionKey: SESSION_KEY
		}));
		const artifactsReader = vi.fn(async () => ({
			artifacts: [
				{
					artifactId: '6ba7b814-9dad-41d4-a716-446655440000',
					latestVersion: 1,
					pdfAvailable: true,
					programCount: 2,
					title: 'Funding plan',
					updatedAt: '2026-06-25T17:00:00.000Z',
					version: 1
				}
			]
		}));
		const turnReader = vi.fn(async () => [
			{
				createdAt: 1,
				message: 'hello',
				runId: 'run-1',
				sessionKey: SESSION_KEY,
				status: 'completed' as const,
				turnId: 'turn-1',
				updatedAt: 2
			}
		]);

		const exported = await exportPennyPrivacyData({
			artifactsReader,
			historyReader,
			now: NOW,
			registry,
			turnReader,
			userId: USER_ID
		});

		expect(exported.userId).toBe(USER_ID);
		expect(exported.exportedAt).toBe(NOW.toISOString());
		expect(exported.sessions).toHaveLength(1);
		expect(exported.sessions[0]?.history.messages[0]?.text).toBe('hello');
		expect(exported.sessions[0]?.artifacts[0]?.title).toBe('Funding plan');
		expect(exported.sessions[0]?.turns[0]?.turnId).toBe('turn-1');
		expect(historyReader).toHaveBeenCalledWith({
			ownershipStore: registry,
			sessionKey: SESSION_KEY
		});
	});

	it('deletes each owned session through the existing session deleter', async () => {
		const registry = registryWithSessions([SESSION]);
		const deleter = vi.fn(async () => undefined);

		const result = await deletePennyPrivacyData({
			deleter,
			now: NOW,
			registry,
			userId: USER_ID
		});

		expect(result).toEqual({
			deletedAt: NOW.toISOString(),
			deletedSessionCount: 1,
			deletedSessionKeys: [SESSION_KEY],
			userId: USER_ID
		});
		expect(deleter).toHaveBeenCalledWith(SESSION_KEY, registry);
	});
});
