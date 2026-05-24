import { describe, expect, it } from 'vitest';

import {
	buildPennySessionKey,
	engagementMemoryPath,
	isAllowedSessionKey,
	isPennySessionKey,
	LEGACY_SESSION_KEY,
	parsePennySessionUuid,
	resolveSessionKey,
	SessionKeyError
} from './session-key.js';

const SAMPLE_UUID = '550e8400-e29b-41d4-a716-446655440000';
const SAMPLE_KEY = buildPennySessionKey(SAMPLE_UUID);
const WORKSPACE_ROOT = '/repo/workspace';

describe('session key helpers', () => {
	it('detects penny session keys', () => {
		expect(isPennySessionKey(SAMPLE_KEY)).toBe(true);
		expect(isPennySessionKey(LEGACY_SESSION_KEY)).toBe(false);
		expect(isPennySessionKey('agent:main:other')).toBe(false);
		expect(isPennySessionKey('agent:main:penny:../../../etc/passwd')).toBe(false);
	});

	it('allows penny and legacy keys only', () => {
		expect(isAllowedSessionKey(SAMPLE_KEY)).toBe(true);
		expect(isAllowedSessionKey(LEGACY_SESSION_KEY)).toBe(true);
		expect(isAllowedSessionKey('agent:main:other')).toBe(false);
	});

	it('resolves allowed session keys', () => {
		expect(resolveSessionKey(SAMPLE_KEY)).toBe(SAMPLE_KEY);
		expect(resolveSessionKey(LEGACY_SESSION_KEY)).toBe(LEGACY_SESSION_KEY);
	});

	it('rejects missing or foreign session keys', () => {
		expect(() => resolveSessionKey(null)).toThrow(SessionKeyError);
		expect(() => resolveSessionKey('agent:main:other')).toThrow(SessionKeyError);
		expect(() => resolveSessionKey('agent:main:penny:../../../etc/passwd')).toThrow(SessionKeyError);
	});

	it('parses penny uuid suffix', () => {
		expect(parsePennySessionUuid(SAMPLE_KEY)).toBe(SAMPLE_UUID);
		expect(parsePennySessionUuid(LEGACY_SESSION_KEY)).toBeNull();
	});

	it('resolves engagement memory path from penny session key', () => {
		expect(engagementMemoryPath(SAMPLE_KEY, WORKSPACE_ROOT)).toBe(
			'/repo/workspace/memory/engagements/550e8400-e29b-41d4-a716-446655440000.md'
		);
		expect(engagementMemoryPath(LEGACY_SESSION_KEY, WORKSPACE_ROOT)).toBeNull();
	});
});
