export const PDF_PREVIEW_INITIAL_PAGE = 1;
export const PDF_PREVIEW_DEFAULT_ZOOM_PERCENT = 100;
export const PDF_PREVIEW_MIN_ZOOM_PERCENT = 50;
export const PDF_PREVIEW_MAX_ZOOM_PERCENT = 200;
export const PDF_PREVIEW_ZOOM_STEP_PERCENT = 25;

type PdfPreviewSourceInput = {
	objectUrl: string;
	page: number;
	zoomPercent: number;
};

export function clampPdfPreviewPage(page: number): number {
	if (!Number.isFinite(page)) {
		return PDF_PREVIEW_INITIAL_PAGE;
	}
	return Math.max(PDF_PREVIEW_INITIAL_PAGE, Math.trunc(page));
}

export function clampPdfPreviewZoom(zoomPercent: number): number {
	if (!Number.isFinite(zoomPercent)) {
		return PDF_PREVIEW_DEFAULT_ZOOM_PERCENT;
	}
	return Math.min(
		PDF_PREVIEW_MAX_ZOOM_PERCENT,
		Math.max(PDF_PREVIEW_MIN_ZOOM_PERCENT, Math.trunc(zoomPercent))
	);
}

export function buildPdfPreviewSource(input: PdfPreviewSourceInput): string {
	const page = clampPdfPreviewPage(input.page);
	const zoomPercent = clampPdfPreviewZoom(input.zoomPercent);
	const fragment = new URLSearchParams({
		toolbar: '0',
		navpanes: '0',
		scrollbar: '1',
		page: String(page),
		zoom: String(zoomPercent)
	});
	return `${input.objectUrl}#${fragment.toString()}`;
}
