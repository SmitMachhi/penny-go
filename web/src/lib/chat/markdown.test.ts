import { describe, expect, it } from 'vitest';

import { renderMarkdown } from './markdown.js';

describe('renderMarkdown', () => {
	it('renders emphasis and headings', () => {
		const html = renderMarkdown('## Title\n\n**Verified live** — details');
		expect(html).toContain('<h2>');
		expect(html).toContain('<strong>Verified live</strong>');
	});

	it('opens links in a new tab safely', () => {
		const html = renderMarkdown('[CRA](https://www.canada.ca/en/revenue-agency.html)');
		expect(html).toContain('target="_blank"');
		expect(html).toContain('rel="noopener noreferrer"');
	});

	it('marks external links for hover previews', () => {
		const html = renderMarkdown('[App Store](https://apps.apple.com/us/app/id123)');
		expect(html).toContain('class="penny-link-preview"');
		expect(html).toContain('data-preview-url="https://apps.apple.com/us/app/id123"');
		expect(html).toContain('penny-link-preview__label">App Store</span>');
		expect(html).toContain('penny-link-preview__icon');
		expect(html).toContain('aria-label="Link to App Store, opens in a new tab"');
		expect(html).toContain('Opens website in a new tab. Hover for preview.');
	});

	it('strips script tags', () => {
		const html = renderMarkdown('hello<script>alert(1)</script>');
		expect(html).not.toContain('<script');
		expect(html).toContain('hello');
	});

	it('escapes quote characters in link href attributes', () => {
		const html = renderMarkdown('[bad](https://example.com/path?x="1")');
		expect(html).toContain('&quot;');
		expect(html).not.toContain('href="https://example.com/path?x="1""');
	});

	it('wraps tables for styled overflow containers', () => {
		const html = renderMarkdown(
			'| Source | Type |\n| --- | --- |\n| CH-ITC | Refundable credit |'
		);
		expect(html).toContain('penny-markdown-table-wrap');
		expect(html).toContain('<th>');
	});
});
