import assert from 'node:assert/strict';
import test from 'node:test';

import { isLabelInUseMessage, uniqueSessionLabel } from './session-label-unique.ts';

test('uniqueSessionLabel returns desired label when unused', () => {
	assert.equal(uniqueSessionLabel('Ontario grants', ['yo', 'New chat']), 'Ontario grants');
});

test('uniqueSessionLabel appends numeric suffix on collision', () => {
	assert.equal(uniqueSessionLabel('yo', ['yo']), 'yo (2)');
	assert.equal(uniqueSessionLabel('yo', ['yo', 'yo (2)']), 'yo (3)');
});

test('isLabelInUseMessage detects gateway duplicate label errors', () => {
	assert.equal(isLabelInUseMessage('label already in use: yo'), true);
	assert.equal(isLabelInUseMessage('gateway offline'), false);
});
