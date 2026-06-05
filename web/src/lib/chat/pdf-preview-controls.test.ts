import { describe, expect, it } from 'vitest';

import {
	buildPdfPreviewSource,
	clampPdfPreviewPage,
	clampPdfPreviewZoom,
	PDF_PREVIEW_DEFAULT_ZOOM_PERCENT,
	PDF_PREVIEW_INITIAL_PAGE,
	PDF_PREVIEW_MAX_ZOOM_PERCENT,
	PDF_PREVIEW_MIN_ZOOM_PERCENT
} from './pdf-preview-controls.js';

describe('pdf preview controls', () => {
	it('builds an embedded PDF URL that hides the native toolbar', () => {
		const source = buildPdfPreviewSource({
			objectUrl: 'blob:penny-preview',
			page: 3,
			zoomPercent: 125
		});

		expect(source).toBe(
			'blob:penny-preview#toolbar=0&navpanes=0&scrollbar=1&page=3&zoom=125'
		);
	});

	it('clamps page numbers to a valid target page', () => {
		expect(clampPdfPreviewPage(Number.NaN)).toBe(PDF_PREVIEW_INITIAL_PAGE);
		expect(clampPdfPreviewPage(0)).toBe(PDF_PREVIEW_INITIAL_PAGE);
		expect(clampPdfPreviewPage(2.8)).toBe(2);
	});

	it('clamps zoom to the supported range', () => {
		expect(clampPdfPreviewZoom(Number.NaN)).toBe(PDF_PREVIEW_DEFAULT_ZOOM_PERCENT);
		expect(clampPdfPreviewZoom(10)).toBe(PDF_PREVIEW_MIN_ZOOM_PERCENT);
		expect(clampPdfPreviewZoom(300)).toBe(PDF_PREVIEW_MAX_ZOOM_PERCENT);
		expect(clampPdfPreviewZoom(124.8)).toBe(124);
	});
});
