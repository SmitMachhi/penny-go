import { describe, expect, it } from 'vitest';

import { applySecurityHeaders } from './security-headers.js';

describe('applySecurityHeaders', () => {
	it('adds the baseline browser security headers', () => {
		const response = applySecurityHeaders(new Response('ok'));

		expect(response.headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin');
		expect(response.headers.get('Permissions-Policy')).toBe(
			'camera=(), geolocation=(), microphone=(), payment=()'
		);
		expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
		expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
		expect(response.headers.get('X-Frame-Options')).toBe('DENY');
	});

	it('does not overwrite route-specific header values', () => {
		const response = applySecurityHeaders(
			new Response('ok', {
				headers: {
					'Referrer-Policy': 'no-referrer'
				}
			})
		);

		expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');
	});
});
