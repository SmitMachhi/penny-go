export const ARTIFACT_PANEL_DEFAULT_WIDTH_PX = 520;
export const ARTIFACT_PANEL_MIN_WIDTH_PX = 360;
export const ARTIFACT_PANEL_MAX_VIEWPORT_RATIO = 0.72;
export const ARTIFACT_PANEL_WIDTH_STORAGE_KEY = 'penny:artifact-panel-width';

export function clampArtifactPanelWidth(widthPx: number, viewportWidth: number): number {
	const maxWidthPx = Math.round(viewportWidth * ARTIFACT_PANEL_MAX_VIEWPORT_RATIO);
	return Math.min(maxWidthPx, Math.max(ARTIFACT_PANEL_MIN_WIDTH_PX, Math.round(widthPx)));
}

export function readStoredArtifactPanelWidth(viewportWidth: number): number {
	if (typeof localStorage === 'undefined') {
		return ARTIFACT_PANEL_DEFAULT_WIDTH_PX;
	}

	const raw = localStorage.getItem(ARTIFACT_PANEL_WIDTH_STORAGE_KEY);
	if (!raw) {
		return ARTIFACT_PANEL_DEFAULT_WIDTH_PX;
	}

	const parsed = Number.parseInt(raw, 10);
	if (!Number.isFinite(parsed)) {
		return ARTIFACT_PANEL_DEFAULT_WIDTH_PX;
	}

	return clampArtifactPanelWidth(parsed, viewportWidth);
}

export function storeArtifactPanelWidth(widthPx: number, viewportWidth: number): void {
	if (typeof localStorage === 'undefined') {
		return;
	}
	localStorage.setItem(
		ARTIFACT_PANEL_WIDTH_STORAGE_KEY,
		String(clampArtifactPanelWidth(widthPx, viewportWidth))
	);
}
