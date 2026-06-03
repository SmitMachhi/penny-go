import { describe, expect, it } from 'vitest';

import { PREVIEW_LINK_HINT_TITLE, renderPreviewLinkHtml } from '$lib/chat/link-preview-markup.js';

describe('renderPreviewLinkHtml', () => {
	it('includes accessibility hint and external icon', () => {
		const html = renderPreviewLinkHtml('https://www.canada.ca/', 'canada.ca', undefined);
		expect(html).toContain(`title="${PREVIEW_LINK_HINT_TITLE}"`);
		expect(html).toContain('penny-link-preview__icon');
		expect(html).toContain('aria-hidden="true"');
	});

	it('respects a custom link title when provided', () => {
		const html = renderPreviewLinkHtml('https://www.canada.ca/', 'CRA', 'Canada Revenue Agency');
		expect(html).toContain('title="Canada Revenue Agency"');
	});
});
