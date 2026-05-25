import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import lockfile from 'proper-lockfile';

import {
	BRIEF_FILENAME,
	META_FILENAME,
	PDF_FILENAME,
	SLIDES_FILENAME,
	resolveArtifactDir,
	resolveArtifactFilePath,
	resolveSessionArtifactIndexPath,
	resolveSessionArtifactsDir
} from '@penny/shared/penny-paths';
import type { FundingBriefInput, FundingBriefRecord } from '@penny/shared/funding-brief';

export type ArtifactMeta = {
	artifactId: string;
	sessionUuid: string;
	title: string;
	programCount: number;
	version: number;
	triggerReason: FundingBriefInput['triggerReason'];
	createdAt: string;
	updatedAt: string;
};

export type ArtifactIndexEntry = ArtifactMeta;

export type PersistFundingBriefResult = {
	record: FundingBriefRecord;
	meta: ArtifactMeta;
	slidesPath: string;
	pdfPath: string;
	briefPath: string;
};

type WriteArtifactFilesInput = {
	repoRoot: string;
	record: FundingBriefRecord;
	meta: ArtifactMeta;
	slidesHtml: string;
	pdfBytes?: Buffer | undefined;
};

export async function persistFundingBriefFiles(
	input: WriteArtifactFilesInput
): Promise<PersistFundingBriefResult> {
	const artifactDir = resolveArtifactDir(
		input.repoRoot,
		input.record.sessionUuid,
		input.record.artifactId
	);
	await mkdir(artifactDir, { recursive: true });

	const briefPath = resolveArtifactFilePath(
		input.repoRoot,
		input.record.sessionUuid,
		input.record.artifactId,
		BRIEF_FILENAME
	);
	const slidesPath = resolveArtifactFilePath(
		input.repoRoot,
		input.record.sessionUuid,
		input.record.artifactId,
		SLIDES_FILENAME
	);
	const metaPath = resolveArtifactFilePath(
		input.repoRoot,
		input.record.sessionUuid,
		input.record.artifactId,
		META_FILENAME
	);
	const pdfPath = resolveArtifactFilePath(
		input.repoRoot,
		input.record.sessionUuid,
		input.record.artifactId,
		PDF_FILENAME
	);

	await writeFile(briefPath, `${JSON.stringify(input.record, null, 2)}\n`, 'utf8');
	await writeFile(slidesPath, input.slidesHtml, 'utf8');
	await writeFile(metaPath, `${JSON.stringify(input.meta, null, 2)}\n`, 'utf8');
	if (input.pdfBytes) {
		await writeFile(pdfPath, input.pdfBytes);
	}

	await upsertSessionArtifactIndex(input.repoRoot, input.meta);

	return {
		record: input.record,
		meta: input.meta,
		slidesPath,
		pdfPath,
		briefPath
	};
}

export async function loadFundingBriefRecord(
	repoRoot: string,
	sessionUuid: string,
	artifactId: string
): Promise<FundingBriefRecord | null> {
	const briefPath = resolveArtifactFilePath(repoRoot, sessionUuid, artifactId, BRIEF_FILENAME);
	try {
		const raw = await readFile(briefPath, 'utf8');
		return JSON.parse(raw) as FundingBriefRecord;
	} catch {
		return null;
	}
}

export function buildFundingBriefRecord(
	input: FundingBriefInput,
	artifactId: string,
	version: number,
	timestamps: { createdAt: string; updatedAt: string }
): FundingBriefRecord {
	return {
		...input,
		artifactId,
		version,
		createdAt: timestamps.createdAt,
		updatedAt: timestamps.updatedAt
	};
}

export function buildArtifactMeta(record: FundingBriefRecord): ArtifactMeta {
	return {
		artifactId: record.artifactId,
		sessionUuid: record.sessionUuid,
		title: record.title,
		programCount: record.programs.length,
		version: record.version,
		triggerReason: record.triggerReason,
		createdAt: record.createdAt,
		updatedAt: record.updatedAt
	};
}

export function createArtifactId(): string {
	return randomUUID();
}

const INDEX_LOCK_MAX_ATTEMPTS = 10;
const INDEX_LOCK_RETRY_MS = 50;
const INDEX_LOCK_STALE_MS = 30_000;

async function withSessionIndexLock<T>(
	indexPath: string,
	action: () => Promise<T>
): Promise<T> {
	let release: (() => Promise<void>) | undefined;
	try {
		release = await lockfile.lock(indexPath, {
			stale: INDEX_LOCK_STALE_MS,
			retries: {
				retries: INDEX_LOCK_MAX_ATTEMPTS,
				minTimeout: INDEX_LOCK_RETRY_MS,
				maxTimeout: INDEX_LOCK_RETRY_MS * INDEX_LOCK_MAX_ATTEMPTS
			}
		});
		return await action();
	} finally {
		if (release) {
			await release().catch(() => undefined);
		}
	}
}

async function upsertSessionArtifactIndex(
	repoRoot: string,
	meta: ArtifactMeta
): Promise<void> {
	const indexPath = resolveSessionArtifactIndexPath(repoRoot, meta.sessionUuid);
	await mkdir(resolveSessionArtifactsDir(repoRoot, meta.sessionUuid), { recursive: true });

	try {
		await readFile(indexPath, 'utf8');
	} catch {
		await writeFile(indexPath, '[]\n', 'utf8');
	}

	await withSessionIndexLock(indexPath, async () => {
		let entries: ArtifactIndexEntry[] = [];
		try {
			const raw = await readFile(indexPath, 'utf8');
			entries = JSON.parse(raw) as ArtifactIndexEntry[];
		} catch {
			entries = [];
		}

		const withoutCurrent = entries.filter((entry) => entry.artifactId !== meta.artifactId);
		withoutCurrent.unshift(meta);

		const tmpPath = `${indexPath}.tmp-${randomUUID()}`;
		await writeFile(tmpPath, `${JSON.stringify(withoutCurrent, null, 2)}\n`, 'utf8');
		await rename(tmpPath, indexPath);
	});
}
