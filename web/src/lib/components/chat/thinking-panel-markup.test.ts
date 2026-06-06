import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const COMPONENT_DIR = fileURLToPath(new URL('.', import.meta.url));

async function readComponentSource(filename: string): Promise<string> {
	return readFile(new URL(filename, `file://${COMPONENT_DIR}`), 'utf8');
}

describe('ThinkingPanel markup', () => {
	it('labels completed reasoning as an evidence trace, not generic thinking', async () => {
		const source = await readComponentSource('ThinkingPanel.svelte');

		expect(source).toContain("const label = 'Evidence trace'");
		expect(source).not.toContain("const label = 'Thinking'");
	});

	it('labels live evidence quest detail as work, not another thinking label', async () => {
		const source = await readComponentSource('EvidenceQuest.svelte');

		expect(source).toContain('penny-evidence-quest__thinking-label">working');
		expect(source).not.toContain('penny-evidence-quest__thinking-label">thinking');
	});
});
