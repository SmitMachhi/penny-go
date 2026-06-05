import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';

test('keeps legacy funding brief model out of the shared root', () => {
	assert.equal(existsSync(new URL('./legacy/funding-brief.ts', import.meta.url)), true);
	assert.equal(existsSync(new URL('./funding-brief.ts', import.meta.url)), false);
});
