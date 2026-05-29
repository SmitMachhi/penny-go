import { describe, expect, it } from 'vitest';

import { injectEmbeddedPreviewStyles } from './artifact-preview.js';

describe('injectEmbeddedPreviewStyles', () => {
	it('injects embed styles before closing head tag', () => {
		const html = '<html><head><title>Test</title></head><body></body></html>';
		const result = injectEmbeddedPreviewStyles(html);
		expect(result).toContain('data-penny-embedded');
		expect(result).toContain('.toolbar { display: none; }');
		expect(result.indexOf('data-penny-embedded')).toBeLessThan(result.indexOf('</head>'));
	});

	it('prepends styles when head tag is missing', () => {
		const html = '<div class="deck"></div>';
		const result = injectEmbeddedPreviewStyles(html);
		expect(result.startsWith('<style data-penny-embedded>')).toBe(true);
	});
});
