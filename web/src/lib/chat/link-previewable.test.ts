import { describe, expect, it } from 'vitest';

import { isPreviewableHref, linkPreviewLabel } from '$lib/chat/link-previewable.js';

describe('link preview helpers', () => {
	it('detects http and https links', () => {
		expect(isPreviewableHref('https://example.com')).toBe(true);
		expect(isPreviewableHref('http://example.com')).toBe(true);
		expect(isPreviewableHref('mailto:a@b.com')).toBe(false);
	});

	it('uses hostname when link text is the raw url', () => {
		const href = 'https://www.apple.com/app/streisand';
		expect(linkPreviewLabel(href, href)).toBe('apple.com');
	});

	it('keeps short custom labels', () => {
		expect(linkPreviewLabel('https://apps.apple.com/', 'App Store')).toBe('App Store');
	});
});
