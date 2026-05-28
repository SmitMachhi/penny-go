import { describe, expect, it } from 'vitest';

import {
	buildPennySessionKey,
	chatPathFromSessionKey,
	LEGACY_ROUTE_ID,
	LEGACY_SESSION_KEY,
	routeIdFromSessionKey,
	sessionKeyFromRouteId
} from './session-routes.js';

const SAMPLE_UUID = '550e8400-e29b-41d4-a716-446655440000';
const SAMPLE_KEY = buildPennySessionKey(SAMPLE_UUID);

describe('session route helpers', () => {
	it('maps penny session keys to uuid routes', () => {
		expect(routeIdFromSessionKey(SAMPLE_KEY)).toBe(SAMPLE_UUID);
		expect(sessionKeyFromRouteId(SAMPLE_UUID)).toBe(SAMPLE_KEY);
		expect(chatPathFromSessionKey(SAMPLE_KEY)).toBe(`/c/${SAMPLE_UUID}`);
	});

	it('accepts uppercase penny session uuids', () => {
		const uppercaseUuid = SAMPLE_UUID.toUpperCase();
		const uppercaseKey = buildPennySessionKey(uppercaseUuid);

		expect(routeIdFromSessionKey(uppercaseKey)).toBe(uppercaseUuid);
		expect(sessionKeyFromRouteId(uppercaseUuid)).toBe(uppercaseKey);
		expect(chatPathFromSessionKey(uppercaseKey)).toBe(`/c/${uppercaseUuid}`);
	});

	it('maps legacy session to reserved slug', () => {
		expect(routeIdFromSessionKey(LEGACY_SESSION_KEY)).toBe(LEGACY_ROUTE_ID);
		expect(sessionKeyFromRouteId(LEGACY_ROUTE_ID)).toBe(LEGACY_SESSION_KEY);
		expect(chatPathFromSessionKey(LEGACY_SESSION_KEY)).toBe(`/c/${LEGACY_ROUTE_ID}`);
	});

	it('rejects invalid route ids and foreign keys', () => {
		expect(sessionKeyFromRouteId('not-a-uuid')).toBeNull();
		expect(routeIdFromSessionKey('agent:main:other')).toBeNull();
		expect(chatPathFromSessionKey('agent:main:other')).toBeNull();
	});
});
