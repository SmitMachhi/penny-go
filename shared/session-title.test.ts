import assert from 'node:assert/strict';
import test from 'node:test';

import { SESSION_TITLE_MAX_CHARS, titleFromFirstMessage } from './session-title.ts';

test('titleFromFirstMessage trims whitespace', () => {
	assert.equal(titleFromFirstMessage('  Ontario dairy grants  '), 'Ontario dairy grants');
});

test('titleFromFirstMessage truncates long prompts', () => {
	const longPrompt = 'a'.repeat(SESSION_TITLE_MAX_CHARS + 10);
	const title = titleFromFirstMessage(longPrompt);
	assert.equal(title.length, SESSION_TITLE_MAX_CHARS);
	assert.equal(title.endsWith('…'), true);
});

test('titleFromFirstMessage falls back for empty input', () => {
	assert.equal(titleFromFirstMessage('   '), 'New chat');
});
