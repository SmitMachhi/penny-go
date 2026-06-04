import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import lockfile from 'proper-lockfile';

import { composePdfMarkdown } from '@penny/shared/artifact-markdown';
import { renderMarkdownToPrintHtml } from '@penny/shared/artifact-print-html';
import { ARTIFACT_FORMAT_VERSION } from '@penny/shared/artifact-validation';
import type { ArtifactMetaRecord, CreateFundingArtifactParams } from '@penny/shared/artifact-types';
import {
	DOCUMENT_MD_FILENAME,
	LEGACY_BRIEF_FILENAME,
	LEGACY_SLIDES_FILENAME,
	META_FILENAME,
	PDF_FILENAME,
	resolveArtifactDir,
	resolveArtifactFilePath,
	resolveSessionArtifactIndexPath,
	resolveSessionArtifactsDir
} from '@penny/shared/penny-paths';

import { renderArtifactPdfFromHtml } from './artifact-pdf.js';
import type { PennyToolsConfigShape } from './penny-config.js';

export type ArtifactIndexEntry = Pick<
	ArtifactMetaRecord,
	| 'artifactId'
	| 'sessionUuid'
	| 'title'
	| 'programCount'
	| 'version'
	| 'triggerReason'
	| 'createdAt'
	| 'updatedAt'
	| 'pdfAvailable'
>;

export type PersistArtifactResult = {
	meta: ArtifactMetaRecord;
	documentPath: string;
	pdfPath: string;
	metaPath: string;
};

type PersistArtifactInput = {
	config: PennyToolsConfigShape;
	repoRoot: string;
	params: CreateFundingArtifactParams;
	artifactId: string;
	version: number;
	createdAt: string;
	updatedAt: string;
	signal?: AbortSignal | undefined;
};

const INDEX_LOCK_MAX_ATTEMPTS = 10;
const INDEX_LOCK_RETRY_MS = 50;
const INDEX_LOCK_STALE_MS = 30_000;

export function createArtifactId(): string {
	return randomUUID();
}

export function buildArtifactMetaRecord(
	params: CreateFundingArtifactParams,
	artifactId: string,
	version: number,
	timestamps: { createdAt: string; updatedAt: string },
	pdfAvailable = true
): ArtifactMetaRecord {
	const programCount = params.evidence?.programs?.length ?? 0;
	return {
		artifactId,
		sessionUuid: params.sessionUuid,
		title: params.title,
		version,
		formatVersion: ARTIFACT_FORMAT_VERSION,
		triggerReason: params.triggerReason,
		createdAt: timestamps.createdAt,
		updatedAt: timestamps.updatedAt,
		programCount,
		pdfAvailable,
		verification: params.verification,
		evidence: params.evidence
	};
}

export async function loadArtifactMetaRecord(
	repoRoot: string,
	sessionUuid: string,
	artifactId: string
): Promise<ArtifactMetaRecord | null> {
	const metaPath = resolveArtifactFilePath(repoRoot, sessionUuid, artifactId, META_FILENAME);
	try {
		const raw = await readFile(metaPath, 'utf8');
		return JSON.parse(raw) as ArtifactMetaRecord;
	} catch {
		return null;
	}
}

export async function persistArtifactFiles(input: PersistArtifactInput): Promise<PersistArtifactResult> {
	const meta = buildArtifactMetaRecord(input.params, input.artifactId, input.version, {
		createdAt: input.createdAt,
		updatedAt: input.updatedAt
	});

	const artifactDir = resolveArtifactDir(input.repoRoot, input.params.sessionUuid, input.artifactId);
	await mkdir(artifactDir, { recursive: true });

	const documentPath = resolveArtifactFilePath(
		input.repoRoot,
		input.params.sessionUuid,
		input.artifactId,
		DOCUMENT_MD_FILENAME
	);
	const metaPath = resolveArtifactFilePath(
		input.repoRoot,
		input.params.sessionUuid,
		input.artifactId,
		META_FILENAME
	);
	const pdfPath = resolveArtifactFilePath(
		input.repoRoot,
		input.params.sessionUuid,
		input.artifactId,
		PDF_FILENAME
	);
	const renderHtmlPath = resolveArtifactFilePath(
		input.repoRoot,
		input.params.sessionUuid,
		input.artifactId,
		'.render.html'
	);

	await writeFile(documentPath, `${input.params.bodyMarkdown.trim()}\n`, 'utf8');
	await writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');

	const pdfMarkdown = composePdfMarkdown(input.params.bodyMarkdown, meta);
	const printHtml = renderMarkdownToPrintHtml(pdfMarkdown, meta.title);
	await writeFile(renderHtmlPath, printHtml, 'utf8');

	const pdfResult = await renderArtifactPdfFromHtml(
		input.config,
		renderHtmlPath,
		pdfPath,
		input.signal
	);

	await rm(renderHtmlPath, { force: true });

	if (!pdfResult.success) {
		throw new Error(pdfResult.error ?? 'pdf_render_failed');
	}

	await removeLegacyArtifactFiles(input.repoRoot, input.params.sessionUuid, input.artifactId);
	await upsertSessionArtifactIndex(input.repoRoot, meta);

	return { meta, documentPath, pdfPath, metaPath };
}

export async function persistArtifactFilesAllowPdfFailure(
	input: PersistArtifactInput
): Promise<PersistArtifactResult & { pdfOk: boolean; pdfError?: string }> {
	try {
		const result = await persistArtifactFiles(input);
		return { ...result, pdfOk: true };
	} catch (error) {
		const message = error instanceof Error ? error.message : 'pdf_render_failed';
			const meta = buildArtifactMetaRecord(
				input.params,
				input.artifactId,
				input.version,
				{ createdAt: input.createdAt, updatedAt: input.updatedAt },
				false
			);
		const artifactDir = resolveArtifactDir(input.repoRoot, input.params.sessionUuid, input.artifactId);
		await mkdir(artifactDir, { recursive: true });
		const documentPath = resolveArtifactFilePath(
			input.repoRoot,
			input.params.sessionUuid,
			input.artifactId,
			DOCUMENT_MD_FILENAME
		);
		const metaPath = resolveArtifactFilePath(
			input.repoRoot,
			input.params.sessionUuid,
			input.artifactId,
			META_FILENAME
		);
			const pdfPath = resolveArtifactFilePath(
				input.repoRoot,
				input.params.sessionUuid,
				input.artifactId,
				PDF_FILENAME
			);
			await rm(pdfPath, { force: true });
			await writeFile(documentPath, `${input.params.bodyMarkdown.trim()}\n`, 'utf8');
			await writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
		await removeLegacyArtifactFiles(input.repoRoot, input.params.sessionUuid, input.artifactId);
		await upsertSessionArtifactIndex(input.repoRoot, meta);
		return {
			meta,
			documentPath,
			pdfPath,
			metaPath,
			pdfOk: false,
			pdfError: message
		};
	}
}

async function removeLegacyArtifactFiles(
	repoRoot: string,
	sessionUuid: string,
	artifactId: string
): Promise<void> {
	const legacyBrief = resolveArtifactFilePath(repoRoot, sessionUuid, artifactId, LEGACY_BRIEF_FILENAME);
	const legacySlides = resolveArtifactFilePath(repoRoot, sessionUuid, artifactId, LEGACY_SLIDES_FILENAME);
	await rm(legacyBrief, { force: true });
	await rm(legacySlides, { force: true });
}

async function withSessionIndexLock<T>(indexPath: string, action: () => Promise<T>): Promise<T> {
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

async function upsertSessionArtifactIndex(repoRoot: string, meta: ArtifactMetaRecord): Promise<void> {
	const indexPath = resolveSessionArtifactIndexPath(repoRoot, meta.sessionUuid);
	await mkdir(resolveSessionArtifactsDir(repoRoot, meta.sessionUuid), { recursive: true });

	try {
		await readFile(indexPath, 'utf8');
	} catch {
		await writeFile(indexPath, '[]\n', 'utf8');
	}

	const indexEntry: ArtifactIndexEntry = {
		artifactId: meta.artifactId,
		sessionUuid: meta.sessionUuid,
		title: meta.title,
		programCount: meta.programCount,
			version: meta.version,
			triggerReason: meta.triggerReason,
			createdAt: meta.createdAt,
			updatedAt: meta.updatedAt,
			pdfAvailable: meta.pdfAvailable
		};

	await withSessionIndexLock(indexPath, async () => {
		let entries: ArtifactIndexEntry[] = [];
		try {
			const raw = await readFile(indexPath, 'utf8');
			entries = JSON.parse(raw) as ArtifactIndexEntry[];
		} catch {
			entries = [];
		}

		const withoutCurrent = entries.filter((entry) => entry.artifactId !== meta.artifactId);
		withoutCurrent.unshift(indexEntry);

		const tmpPath = `${indexPath}.tmp-${randomUUID()}`;
		await writeFile(tmpPath, `${JSON.stringify(withoutCurrent, null, 2)}\n`, 'utf8');
		await rename(tmpPath, indexPath);
	});
}
