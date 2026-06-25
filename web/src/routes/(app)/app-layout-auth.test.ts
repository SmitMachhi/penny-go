import { describe, expect, it } from 'vitest';

import { load } from './+layout.server.js';

const REDIRECT_STATUS = 303;

type LayoutEvent = Parameters<typeof load>[0];

function layoutEvent(user: unknown): LayoutEvent {
	return {
		locals: { user },
		url: new URL('https://penny.test/c/550e8400-e29b-41d4-a716-446655440001?panel=artifact')
	} as LayoutEvent;
}

describe('app layout auth gate', () => {
	it('redirects anonymous users to login with next path', () => {
		expect(() => load(layoutEvent(null))).toThrow(
			expect.objectContaining({
				location: '/login?next=%2Fc%2F550e8400-e29b-41d4-a716-446655440001%3Fpanel%3Dartifact',
				status: REDIRECT_STATUS
			})
		);
	});

	it('allows authenticated users through', () => {
		expect(load(layoutEvent({ id: '550e8400-e29b-41d4-a716-446655440001' }))).toEqual({});
	});
});
