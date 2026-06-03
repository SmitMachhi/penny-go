import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { BRIEF_FILENAME, SLIDES_FILENAME } from '../shared/penny-paths.ts';
import { isLegacySlideHtml } from '../shared/funding-brief-html.ts';
import { renderFundingBriefDocumentHtml } from '../shared/funding-brief-document.ts';
import type { FundingBriefRecord } from '../shared/funding-brief-types.ts';

const REPO_ROOT = process.env.PENNY_REPO_ROOT?.trim() || process.cwd();
const ARTIFACTS_ROOT = join(REPO_ROOT, 'workspace', 'artifacts');

async function migrateArtifact(slidesPath: string): Promise<boolean> {
	const html = await readFile(slidesPath, 'utf8');
	if (!isLegacySlideHtml(html)) {
		return false;
	}

	const briefPath = join(slidesPath, '..', BRIEF_FILENAME);
	let record: FundingBriefRecord;
	try {
		record = JSON.parse(await readFile(briefPath, 'utf8')) as FundingBriefRecord;
	} catch {
		console.warn(`skip ${slidesPath}: missing brief.json`);
		return false;
	}

	const migrated = await renderFundingBriefDocumentHtml(record, REPO_ROOT);
	await writeFile(slidesPath, migrated, 'utf8');
	return true;
}

async function main(): Promise<void> {
	let migrated = 0;
	let scanned = 0;

	const sessionDirs = await readdir(ARTIFACTS_ROOT, { withFileTypes: true }).catch(() => []);
	for (const sessionEntry of sessionDirs) {
		if (!sessionEntry.isDirectory()) {
			continue;
		}
		const sessionDir = join(ARTIFACTS_ROOT, sessionEntry.name);
		const artifactDirs = await readdir(sessionDir, { withFileTypes: true });
		for (const artifactEntry of artifactDirs) {
			if (!artifactEntry.isDirectory()) {
				continue;
			}
			const slidesPath = join(sessionDir, artifactEntry.name, SLIDES_FILENAME);
			try {
				const fileStat = await stat(slidesPath);
				if (!fileStat.isFile()) {
					continue;
				}
			} catch {
				continue;
			}
			scanned += 1;
			if (await migrateArtifact(slidesPath)) {
				migrated += 1;
				console.log(`migrated ${slidesPath}`);
			}
		}
	}

	console.log(`done: migrated ${migrated}/${scanned} brief previews`);
}

await main();
