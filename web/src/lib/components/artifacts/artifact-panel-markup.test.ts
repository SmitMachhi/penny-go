import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const COMPONENT_DIR = fileURLToPath(new URL('.', import.meta.url));
const FUNDING_PLAN_PATTERN = /funding plan/i;
const USER_FACING_COMPONENTS: readonly string[] = [
	'../chat/ArtifactPlanNudge.svelte',
	'../chat/PennyShell.svelte',
	'../chat/ChatView.svelte',
	'ArtifactToolbar.svelte',
	'ArtifactPanel.svelte'
];

async function readComponentSource(filename: string): Promise<string> {
	return readFile(new URL(filename, `file://${COMPONENT_DIR}`), 'utf8');
}

describe('artifact panel markup', () => {
	it('does not render the secondary new-tab bar above PDF previews', async () => {
		const source = await readComponentSource('DocumentPreview.svelte');

		expect(source).not.toMatch(/>\s*Open in new tab\s*</);
		expect(source).not.toContain('flex shrink-0 items-center justify-end gap-2');
	});

	it('hides the native PDF toolbar and renders compact preview controls', async () => {
		const source = await readComponentSource('DocumentPreview.svelte');

		expect(source).toContain('buildPdfPreviewSource');
		expect(source).toContain('aria-label="Zoom out"');
		expect(source).toContain('aria-label="Zoom in"');
		expect(source).toContain('aria-label="PDF page number"');
		expect(source).not.toContain('src="{previewObjectUrl}#view=FitH"');
	});

	it('uses the primary accent for the available download action', async () => {
		const source = await readComponentSource('ArtifactToolbar.svelte');

		expect(source).toContain('bg-primary');
		expect(source).toContain('text-primary-foreground');
		expect(source).toContain('hover:bg-primary/90');
	});

	it('uses the primary accent for the artifact panel nudge', async () => {
		const source = await readComponentSource('../chat/ArtifactPlanNudge.svelte');

		expect(source).toContain('bg-primary');
		expect(source).toContain('text-primary-foreground');
		expect(source).toContain('hover:bg-primary/90');
	});

	it('uses plan wording instead of funding plan wording in user-facing chrome', async () => {
		const sources = await Promise.all(USER_FACING_COMPONENTS.map(readComponentSource));

		expect(sources.join('\n')).not.toMatch(FUNDING_PLAN_PATTERN);
	});
});
