import assert from 'node:assert/strict';
import test from 'node:test';

import {
	buildPennySessionKey,
	isPennySessionKey,
	isValidSessionUuid,
	LEGACY_SESSION_KEY,
	parsePennySessionUuid,
	requirePennySessionUuid
} from './session-key.ts';

const SAMPLE_UUID = '550e8400-e29b-41d4-a716-446655440000';
const SAMPLE_KEY = buildPennySessionKey(SAMPLE_UUID);

test('session key helpers parse penny web chat keys', () => {
	assert.equal(isPennySessionKey(SAMPLE_KEY), true);
	assert.equal(isPennySessionKey(LEGACY_SESSION_KEY), false);
	assert.equal(parsePennySessionUuid(SAMPLE_KEY), SAMPLE_UUID);
	assert.equal(parsePennySessionUuid(LEGACY_SESSION_KEY), null);
	assert.equal(requirePennySessionUuid(SAMPLE_KEY), SAMPLE_UUID);
});

test('session key helpers reject malformed penny keys', () => {
	assert.equal(isPennySessionKey('agent:main:penny:not-a-uuid'), false);
	assert.equal(isPennySessionKey('agent:main:penny:../../../etc/passwd'), false);
	assert.throws(() => requirePennySessionUuid(LEGACY_SESSION_KEY), /invalid_session_key/);
});

test('isValidSessionUuid validates uuid v4 shape', () => {
	assert.equal(isValidSessionUuid(SAMPLE_UUID), true);
	assert.equal(isValidSessionUuid('bad-id'), false);
});
