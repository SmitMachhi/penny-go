import assert from 'node:assert/strict';
import test from 'node:test';

import {
	buildArtifactDownloadFilename,
	parseContentDispositionFilename
} from './artifact-download-filename.ts';

test('buildArtifactDownloadFilename sanitizes punctuation and em dashes', () => {
	const filename = buildArtifactDownloadFilename('KelpCore — Series A memo', 2);
	assert.equal(filename, 'kelpcore-series-a-memo-v2.pdf');
});

test('buildArtifactDownloadFilename falls back when title is empty', () => {
	assert.equal(buildArtifactDownloadFilename('— …', 1), 'penny-funding-memo-v1.pdf');
});

test('parseContentDispositionFilename reads quoted filename', () => {
	const parsed = parseContentDispositionFilename('attachment; filename="kelpcore-v2.pdf"');
	assert.equal(parsed, 'kelpcore-v2.pdf');
});
