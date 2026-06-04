import assert from 'node:assert/strict';
import test from 'node:test';

import { SESSION_TITLE_MAX_CHARS, titleFromFirstMessage } from './session-title.ts';

test('titleFromFirstMessage trims whitespace', () => {
	assert.equal(titleFromFirstMessage('  Ontario dairy grants  '), 'Ontario dairy grants');
});

test('titleFromFirstMessage uses first line only', () => {
	assert.equal(
		titleFromFirstMessage('Ontario dairy grants\n\n- Province: ON'),
		'Ontario dairy grants'
	);
});

test('titleFromFirstMessage strips markdown', () => {
	assert.equal(
		titleFromFirstMessage('**ClearStrata — Kingston, ON** is our company'),
		'ClearStrata — Kingston, ON is our company'
	);
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
