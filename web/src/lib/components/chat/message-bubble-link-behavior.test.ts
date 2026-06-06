import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const MESSAGE_BUBBLE_PATH = 'src/lib/components/chat/MessageBubble.svelte';

describe('MessageBubble link behavior', () => {
	it('lets rendered markdown anchors use their native new-tab behavior', async () => {
		const source = await readFile(MESSAGE_BUBBLE_PATH, 'utf8');

		expect(source).not.toContain('use:interceptArtifactLinks');
		expect(source).not.toContain('handleAssistantClick');
	});
});
