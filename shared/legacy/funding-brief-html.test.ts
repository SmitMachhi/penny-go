import assert from 'node:assert/strict';
import test from 'node:test';

import { isLegacySlideHtml } from './funding-brief-html.ts';

test('isLegacySlideHtml detects slideshow artifacts', () => {
	assert.equal(isLegacySlideHtml('<div class="deck"><button id="nextBtn"></button></div>'), true);
	assert.equal(isLegacySlideHtml('<div class="page-stack"><section class="page"></section></div>'), false);
});
