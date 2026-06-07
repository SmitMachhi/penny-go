import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { ArtifactMetaRecord } from '@penny/shared/artifact-types';
import { repairVersionPdfFromLegacy, resolveArtifactPdfPaths } from '@penny/shared/artifact-pdf-locations';
import {
	ARTIFACT_FORMAT_VERSION,
	MIN_ARTIFACT_VERSION
} from '#artifact-validation-constants';
import {
	buildArtifactVersionSnapshot,
	normalizeArtifactMetaRecord,
	resolveLatestVersion
} from '#artifact-meta';
import { isRecord } from '#artifact-validation-utils';
import {
	DOCUMENT_MD_FILENAME,
	META_FILENAME,
	PDF_FILENAME,
	resolveArtifactDir,
	resolveArtifactFilePath,
	resolveArtifactVersionDir,
	resolveArtifactVersionFilePath,
	VERSION_META_FILENAME,
	VERSIONS_DIR
} from '@penny/shared/penny-paths';

type MigrateArtifactOptions = {
	repoRoot: string;
	sessionUuid: string;
	artifactId: string;
};

export async function ensureArtifactFormatV5(
	options: MigrateArtifactOptions
): Promise<ArtifactMetaRecord | null> {
	const metaPath = resolveArtifactFilePath(
		options.repoRoot,
		options.sessionUuid,
		options.artifactId,
		META_FILENAME
	);
	let rawMeta: unknown;
	try {
		rawMeta = JSON.parse(await readFile(metaPath, 'utf8')) as unknown;
	} catch {
		return null;
	}

	const normalized = normalizeArtifactMetaRecord(rawMeta);
	if (!normalized) {
		return null;
	}

	const existingVersions = await listArtifactVersionNumbers(
		options.repoRoot,
		options.sessionUuid,
		options.artifactId
	);
	if (normalized.formatVersion >= ARTIFACT_FORMAT_VERSION && existingVersions.length > 0) {
		await repairVersionPdfFromLegacy(
			resolveArtifactPdfPaths(
				options.repoRoot,
				options.sessionUuid,
				options.artifactId,
				normalized.latestVersion
			)
		);
		return normalized;
	}

	return migrateFlatArtifactToVersioned(options, normalized, rawMeta);
}

async function migrateFlatArtifactToVersioned(
	options: MigrateArtifactOptions,
	normalized: ArtifactMetaRecord,
	rawMeta: unknown
): Promise<ArtifactMetaRecord> {
	const latestVersion = resolveLatestVersion(isRecord(rawMeta) ? rawMeta : normalized);
	const versionDir = resolveArtifactVersionDir(
		options.repoRoot,
		options.sessionUuid,
		options.artifactId,
		latestVersion
	);
	await mkdir(versionDir, { recursive: true });

	const legacyDocumentPath = resolveArtifactFilePath(
		options.repoRoot,
		options.sessionUuid,
		options.artifactId,
		DOCUMENT_MD_FILENAME
	);
	const legacyPdfPath = resolveArtifactFilePath(
		options.repoRoot,
		options.sessionUuid,
		options.artifactId,
		PDF_FILENAME
	);
	const versionDocumentPath = resolveArtifactVersionFilePath(
		options.repoRoot,
		options.sessionUuid,
		options.artifactId,
		latestVersion,
		DOCUMENT_MD_FILENAME
	);
	const versionPdfPath = resolveArtifactVersionFilePath(
		options.repoRoot,
		options.sessionUuid,
		options.artifactId,
		latestVersion,
		PDF_FILENAME
	);

	await copyIfExists(legacyDocumentPath, versionDocumentPath);
	await copyIfExists(legacyPdfPath, versionPdfPath);

	const snapshot = buildArtifactVersionSnapshot(
		{
			sessionUuid: normalized.sessionUuid,
			title: normalized.title,
			triggerReason: normalized.triggerReason,
			bodyMarkdown: '',
			verification: normalized.verification,
			evidence: normalized.evidence
		},
		latestVersion,
		normalized.updatedAt,
		normalized.pdfAvailable
	);
	const snapshotPath = resolveArtifactVersionFilePath(
		options.repoRoot,
		options.sessionUuid,
		options.artifactId,
		latestVersion,
		VERSION_META_FILENAME
	);
	await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');

	const upgraded: ArtifactMetaRecord = {
		...normalized,
		latestVersion,
		formatVersion: ARTIFACT_FORMAT_VERSION
	};
	const metaPath = resolveArtifactFilePath(
		options.repoRoot,
		options.sessionUuid,
		options.artifactId,
		META_FILENAME
	);
	await writeFile(metaPath, `${JSON.stringify(upgraded, null, 2)}\n`, 'utf8');

	await rm(legacyDocumentPath, { force: true });
	await rm(legacyPdfPath, { force: true });

	return upgraded;
}

async function copyIfExists(sourcePath: string, destinationPath: string): Promise<void> {
	try {
		await stat(sourcePath);
	} catch {
		return;
	}
	await copyFile(sourcePath, destinationPath);
}

export async function listArtifactVersionNumbers(
	repoRoot: string,
	sessionUuid: string,
	artifactId: string
): Promise<number[]> {
	const versionsRoot = resolve(resolveArtifactDir(repoRoot, sessionUuid, artifactId), VERSIONS_DIR);
	let entries: string[] = [];
	try {
		entries = await readdir(versionsRoot);
	} catch {
		return [];
	}

	return entries
		.map((entry) => Number.parseInt(entry, 10))
		.filter((version) => Number.isInteger(version) && version >= MIN_ARTIFACT_VERSION)
		.sort((left, right) => left - right);
}

export function isValidArtifactVersion(version: number, latestVersion: number): boolean {
	return (
		Number.isInteger(version) &&
		version >= MIN_ARTIFACT_VERSION &&
		version <= latestVersion
	);
}
