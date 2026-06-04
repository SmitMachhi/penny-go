import { describe, expect, it } from 'vitest';

import {
	ARTIFACT_PANEL_DEFAULT_WIDTH_PX,
	ARTIFACT_PANEL_MIN_WIDTH_PX,
	clampArtifactPanelWidth
} from './artifact-panel-layout.js';

describe('artifact panel layout', () => {
	it('clamps width between min and viewport ratio', () => {
		expect(clampArtifactPanelWidth(200, 1200)).toBe(ARTIFACT_PANEL_MIN_WIDTH_PX);
		expect(clampArtifactPanelWidth(2000, 1200)).toBe(864);
		expect(clampArtifactPanelWidth(520, 1200)).toBe(520);
	});

	it('defaults to standard width', () => {
		expect(ARTIFACT_PANEL_DEFAULT_WIDTH_PX).toBe(520);
	});
});
