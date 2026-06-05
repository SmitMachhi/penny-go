import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const COMPONENT_DIR = fileURLToPath(new URL('.', import.meta.url));

async function readComponentSource(filename: string): Promise<string> {
	return readFile(new URL(filename, `file://${COMPONENT_DIR}`), 'utf8');
}

describe('artifact panel markup', () => {
	it('does not render the secondary new-tab bar above PDF previews', async () => {
		const source = await readComponentSource('DocumentPreview.svelte');

		expect(source).not.toMatch(/>\s*Open in new tab\s*</);
		expect(source).not.toContain('flex shrink-0 items-center justify-end gap-2');
	});

	it('uses the primary accent for the available download action', async () => {
		const source = await readComponentSource('ArtifactToolbar.svelte');

		expect(source).toContain('bg-primary');
		expect(source).toContain('text-primary-foreground');
		expect(source).toContain('hover:bg-primary/90');
	});
});
