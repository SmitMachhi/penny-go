import { describe, expect, it } from 'vitest';

import { parseLinkPreviewFromHtml } from '$lib/server/link-preview-parse.js';

const SAMPLE_HTML = `<!DOCTYPE html>
<html>
<head>
  <title>Fallback Title</title>
  <meta property="og:title" content="OG Title" />
  <meta property="og:description" content="A helpful description for the page." />
  <meta property="og:site_name" content="Example Site" />
  <link rel="icon" href="/favicon.ico" />
</head>
<body></body>
</html>`;

describe('parseLinkPreviewFromHtml', () => {
	it('prefers open graph metadata', () => {
		const preview = parseLinkPreviewFromHtml(SAMPLE_HTML, new URL('https://example.com/docs'));
		expect(preview.title).toBe('OG Title');
		expect(preview.description).toBe('A helpful description for the page.');
		expect(preview.siteName).toBe('Example Site');
		expect(preview.favicon).toBe('https://example.com/favicon.ico');
	});

	it('drops private network favicon urls', () => {
		const html = '<link rel="icon" href="http://127.0.0.1/admin.ico" />';
		const preview = parseLinkPreviewFromHtml(html, new URL('https://example.com/docs'));

		expect(preview.favicon).toBeNull();
	});
});
