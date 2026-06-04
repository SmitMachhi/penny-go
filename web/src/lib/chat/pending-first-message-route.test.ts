import { describe, expect, it } from 'vitest';

import { isPendingFirstMessageRouteCurrent } from '$lib/chat/pending-first-message-route.js';

const TARGET_ROUTE_ID = '550e8400-e29b-41d4-a716-446655440000';
const OTHER_ROUTE_ID = '550e8400-e29b-41d4-a716-446655440001';
const TARGET_SESSION_KEY = `agent:main:penny:${TARGET_ROUTE_ID}`;
const OTHER_SESSION_KEY = `agent:main:penny:${OTHER_ROUTE_ID}`;

describe('isPendingFirstMessageRouteCurrent', () => {
	it('accepts matching route and session state', () => {
		expect(
			isPendingFirstMessageRouteCurrent({
				loadedRouteId: TARGET_ROUTE_ID,
				targetRouteId: TARGET_ROUTE_ID,
				currentRouteId: TARGET_ROUTE_ID,
				currentSessionKey: TARGET_SESSION_KEY,
				targetSessionKey: TARGET_SESSION_KEY
			})
		).toBe(true);
	});

	it('rejects stale route continuations after navigation', () => {
		expect(
			isPendingFirstMessageRouteCurrent({
				loadedRouteId: OTHER_ROUTE_ID,
				targetRouteId: TARGET_ROUTE_ID,
				currentRouteId: OTHER_ROUTE_ID,
				currentSessionKey: OTHER_SESSION_KEY,
				targetSessionKey: TARGET_SESSION_KEY
			})
		).toBe(false);
	});
});
