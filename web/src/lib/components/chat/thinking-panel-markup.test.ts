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

	it('animates only the evidence quest headline status text', async () => {
		const source = await readComponentSource('EvidenceQuest.svelte');

		expect(source).toContain('AnimatedWorkingStatus');
		expect(source).toContain('<AnimatedWorkingStatus status={quest.status} active={!answerStarted} />');
		expect(source).toContain('<ToolStrip {tools} />');
	});

	it('marks streamed answer text as a draft while Penny is working', async () => {
		const source = await readComponentSource('MessageBubble.svelte');

		expect(source).toContain('penny-draft-answer');
		expect(source).toContain('drafting answer');
	});
});
