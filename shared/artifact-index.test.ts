import assert from 'node:assert/strict';
import test from 'node:test';

import {
	buildArtifactIndexEntry,
	mergeArtifactIndexEntries,
	normalizeArtifactIndexEntry
} from './artifact-index.ts';
import type { ArtifactMetaRecord } from './artifact-types.ts';

const BASE_META: ArtifactMetaRecord = {
	artifactId: '6ba7b814-9dad-41d4-a716-446655440000',
	sessionUuid: '550e8400-e29b-41d4-a716-446655440000',
	title: 'Ontario SaaS funding',
	latestVersion: 2,
	formatVersion: 5,
	triggerReason: 'auto',
	createdAt: '2026-06-02T12:00:00.000Z',
	updatedAt: '2026-06-02T13:00:00.000Z',
	programCount: 1,
	pdfAvailable: true,
	verification: {
		verifiedAt: '2026-06-02T11:00:00.000Z',
		urlsChecked: ['https://example.ca/program']
	}
};

test('buildArtifactIndexEntry keeps only list metadata', () => {
	assert.deepEqual(buildArtifactIndexEntry(BASE_META), {
		artifactId: BASE_META.artifactId,
		sessionUuid: BASE_META.sessionUuid,
		title: BASE_META.title,
		programCount: BASE_META.programCount,
		latestVersion: BASE_META.latestVersion,
		triggerReason: BASE_META.triggerReason,
		createdAt: BASE_META.createdAt,
		updatedAt: BASE_META.updatedAt,
		pdfAvailable: BASE_META.pdfAvailable
	});
});

test('normalizeArtifactIndexEntry accepts legacy version metadata', () => {
	const entry = normalizeArtifactIndexEntry({ ...buildArtifactIndexEntry(BASE_META), latestVersion: undefined, version: 3 });
	assert.equal(entry?.latestVersion, 3);
});

test('mergeArtifactIndexEntries prefers index entries and sorts newest first', () => {
	const older = buildArtifactIndexEntry({
		...BASE_META,
		artifactId: '7ba7b814-9dad-41d4-a716-446655440000',
		updatedAt: '2026-06-02T10:00:00.000Z'
	});
	const disk = buildArtifactIndexEntry({ ...BASE_META, title: 'From disk' });
	const index = buildArtifactIndexEntry({ ...BASE_META, title: 'From index' });

	assert.deepEqual(mergeArtifactIndexEntries([index], [older, disk]), [index, older]);
});
