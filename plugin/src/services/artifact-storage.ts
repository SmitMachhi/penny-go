import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import lockfile from 'proper-lockfile';

import { buildArtifactIndexEntry, type ArtifactIndexEntry } from '@penny/shared/artifact-index';
import { composePdfMarkdown } from '@penny/shared/artifact-markdown';
import {
	buildArtifactMetaRecord,
	buildArtifactVersionSnapshot,
	ensureArtifactFormatV5,
	normalizeArtifactMetaRecord
} from '@penny/shared/artifact-validation';
import { renderMarkdownToPrintHtml } from '@penny/shared/artifact-print-html';
import type {
	ArtifactMetaRecord,
	ArtifactVersionSnapshot,
	CreateFundingArtifactParams
} from '@penny/shared/artifact-types';
import { writeSecureBinaryFile, writeSecureTextFile } from '@penny/shared/app-encryption';
import {
	DOCUMENT_MD_FILENAME,
	LEGACY_BRIEF_FILENAME,
	LEGACY_SLIDES_FILENAME,
	META_FILENAME,
	PDF_FILENAME,
	resolveArtifactDir,
	resolveArtifactFilePath,
	resolveArtifactVersionDir,
	resolveArtifactVersionFilePath,
	resolveSessionArtifactIndexPath,
	resolveSessionArtifactsDir,
	VERSION_META_FILENAME
} from '@penny/shared/penny-paths';

import { renderArtifactPdfFromHtml } from './artifact-pdf.js';
import { artifactContentKey } from './artifact-encryption.js';
import type { PennyToolsConfigShape } from './penny-config.js';

export type PersistArtifactResult = {
	meta: ArtifactMetaRecord;
	documentPath: string;
	pdfPath: string;
	metaPath: string;
	version: number;
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

type PersistArtifactPaths = {
	artifactDir: string;
	versionDir: string;
	documentPath: string;
	pdfPath: string;
	metaPath: string;
	snapshotPath: string;
	renderHtmlPath: string;
};

const INDEX_LOCK_MAX_ATTEMPTS = 10;
const INDEX_LOCK_RETRY_MS = 50;
const INDEX_LOCK_STALE_MS = 30_000;

class PdfRenderError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'PdfRenderError';
	}
}

export function createArtifactId(): string {
	return randomUUID();
}

export { buildArtifactMetaRecord } from '@penny/shared/artifact-validation';

export async function loadArtifactMetaRecord(
	repoRoot: string,
	sessionUuid: string,
	artifactId: string
): Promise<ArtifactMetaRecord | null> {
	await ensureArtifactFormatV5({ repoRoot, sessionUuid, artifactId });
	const metaPath = resolveArtifactFilePath(repoRoot, sessionUuid, artifactId, META_FILENAME);
	try {
		const raw = await readFile(metaPath, 'utf8');
		return normalizeArtifactMetaRecord(JSON.parse(raw) as unknown);
	} catch {
		return null;
	}
}

export async function persistArtifactFiles(input: PersistArtifactInput): Promise<PersistArtifactResult> {
	const snapshot = buildArtifactVersionSnapshot(
		input.params,
		input.version,
		input.updatedAt,
		true
	);
	const meta = buildArtifactMetaRecord(input.params, input.artifactId, input.version, {
		createdAt: input.createdAt,
		updatedAt: input.updatedAt
	});
	const paths = resolvePersistArtifactPaths(input);
	await prepareArtifactVersion(paths);
	await writeArtifactDocumentAndSnapshot(input, snapshot, paths);

	const pdfMarkdown = composePdfMarkdown(input.params.bodyMarkdown, meta);
	const printHtml = renderMarkdownToPrintHtml(pdfMarkdown, {
		title: input.params.title,
		version: input.version,
		preparedAt: input.updatedAt,
		changeSummary: input.params.changeSummary
	});
	await writeFile(paths.renderHtmlPath, printHtml, 'utf8');

	await renderPdfOrThrow(input, paths.renderHtmlPath, paths.pdfPath);
	await sealArtifactPdf(paths.pdfPath, input.params.sessionUuid);
	await finalizeArtifactPersistence(input, meta, paths);

	return {
		meta,
		documentPath: paths.documentPath,
		pdfPath: paths.pdfPath,
		metaPath: paths.metaPath,
		version: input.version
	};
}

async function renderPdfOrThrow(
	input: PersistArtifactInput,
	renderHtmlPath: string,
	pdfPath: string
): Promise<void> {
	let pdfResult: { success: boolean; error?: string } | undefined;
	try {
		pdfResult = await renderArtifactPdfFromHtml(input.config, renderHtmlPath, pdfPath, input.signal);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'pdf_render_failed';
		throw new PdfRenderError(message);
	} finally {
		await rm(renderHtmlPath, { force: true }).catch(() => undefined);
	}

	if (!pdfResult.success) {
		throw new PdfRenderError(pdfResult.error ?? 'pdf_render_failed');
	}
}

export async function persistArtifactFilesAllowPdfFailure(
	input: PersistArtifactInput
): Promise<PersistArtifactResult & { pdfOk: boolean; pdfError?: string }> {
	try {
		const result = await persistArtifactFiles(input);
		return { ...result, pdfOk: true };
	} catch (error) {
		if (!(error instanceof PdfRenderError)) {
			throw error;
		}
		const message = error instanceof Error ? error.message : 'pdf_render_failed';
		return persistArtifactWithoutPdf(input, message);
	}
}

function resolvePersistArtifactPaths(input: PersistArtifactInput): PersistArtifactPaths {
	const artifactDir = resolveArtifactDir(input.repoRoot, input.params.sessionUuid, input.artifactId);
	const versionDir = resolveArtifactVersionDir(
		input.repoRoot,
		input.params.sessionUuid,
		input.artifactId,
		input.version
	);
	return {
		artifactDir,
		versionDir,
		documentPath: resolveArtifactVersionFilePath(
			input.repoRoot,
			input.params.sessionUuid,
			input.artifactId,
			input.version,
			DOCUMENT_MD_FILENAME
		),
		pdfPath: resolveArtifactVersionFilePath(
			input.repoRoot,
			input.params.sessionUuid,
			input.artifactId,
			input.version,
			PDF_FILENAME
		),
		metaPath: resolveArtifactFilePath(
			input.repoRoot,
			input.params.sessionUuid,
			input.artifactId,
			META_FILENAME
		),
		snapshotPath: resolveArtifactVersionFilePath(
			input.repoRoot,
			input.params.sessionUuid,
			input.artifactId,
			input.version,
			VERSION_META_FILENAME
		),
		renderHtmlPath: resolveArtifactVersionFilePath(
			input.repoRoot,
			input.params.sessionUuid,
			input.artifactId,
			input.version,
			'.render.html'
		)
	};
}

async function prepareArtifactVersion(paths: PersistArtifactPaths): Promise<void> {
	await mkdir(paths.artifactDir, { recursive: true });
	await mkdir(paths.versionDir, { recursive: true });
}

async function writeArtifactDocumentAndSnapshot(
	input: PersistArtifactInput,
	snapshot: ArtifactVersionSnapshot,
	paths: PersistArtifactPaths
): Promise<void> {
	const contentKey = artifactContentKey(input.params.sessionUuid);
	await writeSecureTextFile(
		paths.documentPath,
		`${input.params.bodyMarkdown.trim()}\n`,
		contentKey
	);
	await writeSecureTextFile(
		paths.snapshotPath,
		`${JSON.stringify(snapshot, null, 2)}\n`,
		contentKey
	);
}

async function sealArtifactPdf(pdfPath: string, sessionUuid: string): Promise<void> {
	const contentKey = artifactContentKey(sessionUuid);
	if (!contentKey) {
		return;
	}
	const pdfBytes = await readFile(pdfPath);
	await writeSecureBinaryFile(pdfPath, pdfBytes, contentKey);
}

async function finalizeArtifactPersistence(
	input: PersistArtifactInput,
	meta: ArtifactMetaRecord,
	paths: PersistArtifactPaths
): Promise<void> {
	await writeFile(paths.metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
	await removeLegacyArtifactFiles(input.repoRoot, input.params.sessionUuid, input.artifactId);
	await removeRootArtifactDeliverables(input.repoRoot, input.params.sessionUuid, input.artifactId);
	await upsertSessionArtifactIndex(input.repoRoot, meta);
}

async function persistArtifactWithoutPdf(
	input: PersistArtifactInput,
	message: string
): Promise<PersistArtifactResult & { pdfOk: false; pdfError: string }> {
	const snapshot = buildArtifactVersionSnapshot(input.params, input.version, input.updatedAt, false);
	const meta = buildArtifactMetaRecord(
		input.params,
		input.artifactId,
		input.version,
		{ createdAt: input.createdAt, updatedAt: input.updatedAt },
		false
	);
	const paths = resolvePersistArtifactPaths(input);

	await prepareArtifactVersion(paths);
	await writeArtifactDocumentAndSnapshot(input, snapshot, paths);
	await rm(paths.pdfPath, { force: true });
	await finalizeArtifactPersistence(input, meta, paths);

	return {
		meta,
		documentPath: paths.documentPath,
		pdfPath: paths.pdfPath,
		metaPath: paths.metaPath,
		version: input.version,
		pdfOk: false,
		pdfError: message
	};
}

async function removeRootArtifactDeliverables(
	repoRoot: string,
	sessionUuid: string,
	artifactId: string
): Promise<void> {
	const legacyDocument = resolveArtifactFilePath(repoRoot, sessionUuid, artifactId, DOCUMENT_MD_FILENAME);
	const legacyPdf = resolveArtifactFilePath(repoRoot, sessionUuid, artifactId, PDF_FILENAME);
	await rm(legacyDocument, { force: true });
	await rm(legacyPdf, { force: true });
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

	const indexEntry = buildArtifactIndexEntry(meta);

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
