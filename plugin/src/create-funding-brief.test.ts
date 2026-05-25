import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
	buildArtifactMeta,
	buildFundingBriefRecord,
	loadFundingBriefRecord,
	persistFundingBriefFiles
} from './services/funding-brief-storage.js';
import { renderFundingBriefSlidesHtml } from './services/funding-brief-slides.js';
import { escapeHtml, validateFundingBriefInput } from './domain/funding-brief.js';

const SESSION_UUID = '550e8400-e29b-41d4-a716-446655440000';

function sampleBriefInput() {
	return {
		sessionUuid: SESSION_UUID,
		title: 'Ontario SaaS funding brief',
		triggerReason: 'auto' as const,
		business: {
			name: 'Acme SaaS',
			province: 'Ontario',
			sector: 'Software'
		},
		programs: [
			{
				name: 'IRAP',
				whyFit: 'Supports R&D hiring.',
				whyNot: 'Requires NRC advisor intake.',
				benefitType: 'Grant',
				intakeStatus: 'Open',
				officialUrl: 'https://nrc.canada.ca/en/support-technology-innovation',
				confidence: 'verified_live' as const,
				nextStep: 'Contact an IRAP ITA.'
			}
		],
		verification: {
			verifiedAt: '2026-05-24T12:00:00.000Z',
			urlsChecked: ['https://nrc.canada.ca/en/support-technology-innovation']
		}
	};
}

test('escapeHtml encodes dangerous characters', () => {
	assert.equal(escapeHtml('<script>"\'&</script>'), '&lt;script&gt;&quot;&#39;&amp;&lt;/script&gt;');
});

test('renderFundingBriefSlidesHtml includes title and program name', async () => {
	const validation = validateFundingBriefInput(sampleBriefInput());
	assert.equal(validation.ok, true);
	if (!validation.ok) {
		return;
	}

	const record = buildFundingBriefRecord(validation.value, '6ba7b814-9dad-41d4-a716-446655440000', 1, {
		createdAt: '2026-05-24T12:00:00.000Z',
		updatedAt: '2026-05-24T12:00:00.000Z'
	});
	const repoRoot = join(process.cwd(), '..');
	const html = await renderFundingBriefSlidesHtml(record, repoRoot);
	assert.match(html, /Ontario SaaS funding brief/);
	assert.match(html, /IRAP/);
	assert.match(html, /Verified live/);
});

test('persistFundingBriefFiles writes brief and slides', async () => {
	const validation = validateFundingBriefInput(sampleBriefInput());
	assert.equal(validation.ok, true);
	if (!validation.ok) {
		return;
	}

	const repoRoot = await mkdtemp(join(tmpdir(), 'penny-artifact-'));
	const record = buildFundingBriefRecord(validation.value, '6ba7b814-9dad-41d4-a716-446655440000', 1, {
		createdAt: '2026-05-24T12:00:00.000Z',
		updatedAt: '2026-05-24T12:00:00.000Z'
	});
	const meta = buildArtifactMeta(record);
	const html = await renderFundingBriefSlidesHtml(record, join(process.cwd(), '..'));

	const result = await persistFundingBriefFiles({
		repoRoot,
		record,
		meta,
		slidesHtml: html
	});

	const slides = await readFile(result.slidesPath, 'utf8');
	assert.match(slides, /Funding brief/);
});

test('persistFundingBriefFiles bumps version on update', async () => {
	const validation = validateFundingBriefInput(sampleBriefInput());
	assert.equal(validation.ok, true);
	if (!validation.ok) {
		return;
	}

	const repoRoot = await mkdtemp(join(tmpdir(), 'penny-artifact-update-'));
	const artifactId = '6ba7b814-9dad-41d4-a716-446655440000';
	const recordV1 = buildFundingBriefRecord(validation.value, artifactId, 1, {
		createdAt: '2026-05-24T12:00:00.000Z',
		updatedAt: '2026-05-24T12:00:00.000Z'
	});
	const html = await renderFundingBriefSlidesHtml(recordV1, join(process.cwd(), '..'));

	await persistFundingBriefFiles({
		repoRoot,
		record: recordV1,
		meta: buildArtifactMeta(recordV1),
		slidesHtml: html
	});

	const recordV2 = buildFundingBriefRecord(
		{ ...validation.value, title: 'Updated brief' },
		artifactId,
		2,
		{
			createdAt: recordV1.createdAt,
			updatedAt: '2026-05-24T13:00:00.000Z'
		}
	);

	await persistFundingBriefFiles({
		repoRoot,
		record: recordV2,
		meta: buildArtifactMeta(recordV2),
		slidesHtml: await renderFundingBriefSlidesHtml(recordV2, join(process.cwd(), '..'))
	});

	const stored = await loadFundingBriefRecord(repoRoot, validation.value.sessionUuid, artifactId);
	assert.equal(stored?.version, 2);
	assert.equal(stored?.title, 'Updated brief');
});
