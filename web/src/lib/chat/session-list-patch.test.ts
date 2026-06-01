import { describe, expect, it } from 'vitest';

import {
	bumpSessionInList,
	mergeSessionListFromServer,
	replaceSessionView,
	upsertSessionView
} from './session-list-patch.js';

const SESSION_KEY = 'agent:main:penny:test';

const sampleSession = {
	key: SESSION_KEY,
	title: 'New chat',
	titleStatus: 'ready' as const,
	updatedAt: 100,
	isLegacy: false
};

describe('session-list-patch', () => {
	it('moves bumped session to top', () => {
		const sessions = [
			{ ...sampleSession, key: 'agent:main:penny:other', updatedAt: 200 },
			sampleSession
		];
		const patched = bumpSessionInList(sessions, SESSION_KEY);
		expect(patched[0]?.key).toBe(SESSION_KEY);
		expect(patched[0]?.updatedAt).toBeGreaterThan(100);
	});

	it('upserts session titles', () => {
		const ready = {
			...sampleSession,
			title: 'Ontario SaaS grant',
			titleStatus: 'ready' as const
		};
		const patched = upsertSessionView([sampleSession], ready);
		expect(patched[0]?.title).toBe('Ontario SaaS grant');
	});

	it('replaces session titles without reordering the list', () => {
		const newerSession = { ...sampleSession, key: 'agent:main:penny:newer', updatedAt: 200 };
		const olderSession = { ...sampleSession, key: 'agent:main:penny:older', updatedAt: 100 };
		const titledOlderSession = {
			...olderSession,
			title: 'Ontario SaaS grant',
			titleStatus: 'ready' as const
		};

		const patched = replaceSessionView([newerSession, olderSession], titledOlderSession);

		expect(patched.map((session) => session.key)).toEqual([
			'agent:main:penny:newer',
			'agent:main:penny:older'
		]);
		expect(patched[1]?.title).toBe('Ontario SaaS grant');
	});

	it('preserves locally set titles when server refresh is still New chat', () => {
		const localTitle = {
			...sampleSession,
			title: 'Ontario dairy funding',
			titleStatus: 'ready' as const
		};
		const serverDefault = { ...sampleSession, title: 'New chat', titleStatus: 'ready' as const };
		const merged = mergeSessionListFromServer([serverDefault], [localTitle]);
		expect(merged[0]?.title).toBe('Ontario dairy funding');
	});
});
