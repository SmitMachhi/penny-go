import { beforeEach, describe, expect, it, vi } from 'vitest';

const storage = new Map<string, string>();

vi.stubGlobal('localStorage', {
	getItem: (key: string) => storage.get(key) ?? null,
	setItem: (key: string, value: string) => {
		storage.set(key, value);
	},
	removeItem: (key: string) => {
		storage.delete(key);
	},
	clear: () => {
		storage.clear();
	}
});

import {
	ACTIVE_SESSION_STORAGE_KEY,
	pickBootstrapSessionKey,
	readActiveSessionKey,
	writeActiveSessionKey
} from './active-session.js';

describe('active session storage', () => {
	beforeEach(() => {
		storage.clear();
	});

	it('reads and writes active session key', () => {
		expect(readActiveSessionKey()).toBeNull();

		writeActiveSessionKey('agent:main:penny:abc');
		expect(storage.get(ACTIVE_SESSION_STORAGE_KEY)).toBe('agent:main:penny:abc');
		expect(readActiveSessionKey()).toBe('agent:main:penny:abc');
	});

	it('prefers stored key when it exists in session list', () => {
		const sessions = [{ key: 'agent:main:penny:new' }, { key: 'agent:main:penny:old' }];
		expect(pickBootstrapSessionKey('agent:main:penny:old', sessions)).toBe('agent:main:penny:old');
	});

	it('falls back to newest session when stored key is missing', () => {
		const sessions = [{ key: 'agent:main:penny:new' }, { key: 'agent:main:penny:old' }];
		expect(pickBootstrapSessionKey('agent:main:penny:gone', sessions)).toBe('agent:main:penny:new');
	});

	it('returns null when no sessions exist', () => {
		expect(pickBootstrapSessionKey(null, [])).toBeNull();
	});
});
