import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';

const CHAT_CLIENT_PATH = new URL('./client.svelte.ts', import.meta.url);
const MAX_SOURCE_LINES = 500;

describe('chat client architecture', () => {
	it('keeps the Svelte client facade under the repo line limit', () => {
		const source = readFileSync(CHAT_CLIENT_PATH, 'utf8');
		const lineCount = source.split('\n').length;

		expect(lineCount).toBeLessThanOrEqual(MAX_SOURCE_LINES);
	});
});
