import { describe, expect, it } from 'vitest';

import { ValidationError } from '$lib/server/api-error.js';
import { parsePreviewableUrl } from '$lib/server/link-preview-url.js';

describe('parsePreviewableUrl', () => {
	it('accepts public https urls', () => {
		const url = parsePreviewableUrl('https://www.canada.ca/en/revenue-agency.html');
		expect(url.hostname).toBe('www.canada.ca');
	});

	it('rejects missing urls', () => {
		expect(() => parsePreviewableUrl('')).toThrow(ValidationError);
	});

	it('rejects non-http schemes', () => {
		expect(() => parsePreviewableUrl('file:///etc/passwd')).toThrow(ValidationError);
	});

	it('rejects localhost', () => {
		expect(() => parsePreviewableUrl('http://localhost:5173/')).toThrow(ValidationError);
	});

	it('rejects private ipv4 hosts', () => {
		expect(() => parsePreviewableUrl('http://192.168.0.1/')).toThrow(ValidationError);
	});

	it('rejects non-public ipv4 hosts', () => {
		expect(() => parsePreviewableUrl('http://100.64.0.1/')).toThrow(ValidationError);
		expect(() => parsePreviewableUrl('http://198.18.0.1/')).toThrow(ValidationError);
	});

	it('accepts public ipv6 hosts', () => {
		const url = parsePreviewableUrl('https://[2606:2800:220:1:248:1893:25c8:1946]/');
		expect(url.hostname).toBe('[2606:2800:220:1:248:1893:25c8:1946]');
	});

	it('rejects private ipv6 hosts', () => {
		expect(() => parsePreviewableUrl('http://[fd00::1]/')).toThrow(ValidationError);
		expect(() => parsePreviewableUrl('http://[fe80::1]/')).toThrow(ValidationError);
	});

	it('rejects private ipv4-mapped ipv6 hosts', () => {
		expect(() => parsePreviewableUrl('http://[::ffff:7f00:1]/')).toThrow(ValidationError);
		expect(() => parsePreviewableUrl('http://[::ffff:a00:1]/')).toThrow(ValidationError);
	});

	it('rejects credentials in urls', () => {
		expect(() => parsePreviewableUrl('https://user:pass@example.com')).toThrow(ValidationError);
	});
});
