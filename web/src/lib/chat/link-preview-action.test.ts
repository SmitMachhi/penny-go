import { describe, expect, it } from 'vitest';

import { resolvePreviewUrlForAnchor } from '$lib/chat/link-preview-action.js';

function anchor(href: string, previewUrl: string): Parameters<typeof resolvePreviewUrlForAnchor>[0] {
	return { href, dataset: { previewUrl } };
}

describe('resolvePreviewUrlForAnchor', () => {
	it('accepts matching href and preview url', () => {
		expect(
			resolvePreviewUrlForAnchor(anchor('https://www.canada.ca/page', 'https://www.canada.ca/page'))
		).toBe('https://www.canada.ca/page');
	});

	it('rejects spoofed preview urls that do not match href', () => {
		expect(
			resolvePreviewUrlForAnchor(
				anchor('https://www.canada.ca/page', 'https://tracker.example/collect')
			)
		).toBeNull();
	});
});
