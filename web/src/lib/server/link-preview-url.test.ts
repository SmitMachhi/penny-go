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

	it('rejects credentials in urls', () => {
		expect(() => parsePreviewableUrl('https://user:pass@example.com')).toThrow(ValidationError);
	});
});
