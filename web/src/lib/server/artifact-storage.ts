import { readFile, readdir, rm } from 'node:fs/promises';

import {
	repairVersionPdfFromLegacy,
	resolveArtifactPdfPaths,
	resolveReadableArtifactPdfPath
} from '@penny/shared/artifact-pdf-locations';
import {
	mergeArtifactIndexEntries,
	normalizeArtifactIndexEntry,
	type ArtifactIndexEntry
} from '@penny/shared/artifact-index';
import {
	ensureArtifactFormatV5,
	isValidArtifactVersion,
	listArtifactVersionNumbers,
	normalizeArtifactMetaRecord
} from '@penny/shared/artifact-validation';
import type { ArtifactVersionSnapshot } from '@penny/shared/artifact-types';
import {
	META_FILENAME,
	VERSION_META_FILENAME,
	isValidArtifactId,
	resolveArtifactFilePath,
	resolveArtifactVersionFilePath,
	resolveSessionArtifactIndexPath,
	resolveSessionArtifactsDir
} from '@penny/shared/penny-paths';

import type { ArtifactSummary, ArtifactVersionSummary } from '$lib/chat/artifacts.js';
import { parsePennySessionUuid } from '$lib/server/session-key.js';
import { resolvePennyRepoRootFromEnv } from '$lib/server/penny-config.js';

export type ArtifactMeta = ArtifactIndexEntry;

export type ArtifactDetail = {
	artifact: ArtifactSummary;
	versions: ArtifactVersionSummary[];
};

export function toArtifactSummary(meta: ArtifactMeta, pdfAvailable: boolean): ArtifactSummary {
	return {
		artifactId: meta.artifactId,
		title: meta.title,
		programCount: meta.programCount,
		version: meta.latestVersion,
		latestVersion: meta.latestVersion,
		updatedAt: meta.updatedAt,
		pdfAvailable
	};
}

function normalizeWebArtifactMeta(raw: unknown): ArtifactMeta | null {
	const record = normalizeArtifactMetaRecord(raw);
	if (!record) {
		return null;
	}
	return {
		artifactId: record.artifactId,
		sessionUuid: record.sessionUuid,
		title: record.title,
		programCount: record.programCount,
		latestVersion: record.latestVersion,
		triggerReason: record.triggerReason,
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
		pdfAvailable: record.pdfAvailable
	};
}

export async function listSessionArtifacts(sessionKey: string): Promise<ArtifactMeta[]> {
	const sessionUuid = parsePennySessionUuid(sessionKey);
	if (!sessionUuid) {
		return [];
	}

	const repoRoot = resolvePennyRepoRootFromEnv();
	const indexPath = resolveSessionArtifactIndexPath(repoRoot, sessionUuid);
	let indexEntries: ArtifactMeta[] = [];
	try {
		const raw = await readFile(indexPath, 'utf8');
		const parsed = JSON.parse(raw) as unknown;
		if (Array.isArray(parsed)) {
			indexEntries = parsed.flatMap((entry) => {
				const normalized = normalizeArtifactIndexEntry(entry);
				return normalized ? [normalized] : [];
			});
		}
	} catch {
		indexEntries = [];
	}

	return mergeArtifactIndexEntries(indexEntries, await scanSessionArtifactMetas(sessionKey));
}

export async function listSessionArtifactSummaries(sessionKey: string): Promise<ArtifactSummary[]> {
	const metas = await listSessionArtifacts(sessionKey);
	return Promise.all(
		metas.map(async (meta) => {
			const pdfAvailable = await artifactPdfExists(
				sessionKey,
				meta.artifactId,
				meta.latestVersion
			);
			return toArtifactSummary(meta, pdfAvailable);
		})
	);
}

export async function getArtifactMeta(
	sessionKey: string,
	artifactId: string
): Promise<ArtifactMeta | null> {
	if (!isValidArtifactId(artifactId)) {
		return null;
	}

	const fromList = (await listSessionArtifacts(sessionKey)).find(
		(entry) => entry.artifactId === artifactId
	);
	if (fromList) {
		return fromList;
	}

	return readArtifactMetaFile(sessionKey, artifactId);
}

export async function getArtifactDetail(
	sessionKey: string,
	artifactId: string
): Promise<ArtifactDetail | null> {
	const meta = await getArtifactMeta(sessionKey, artifactId);
	if (!meta) {
		return null;
	}

	const versions = await listArtifactVersions(sessionKey, artifactId);
	const pdfAvailable = await artifactPdfExists(sessionKey, artifactId, meta.latestVersion);
	return {
		artifact: toArtifactSummary(meta, pdfAvailable),
		versions
	};
}

export async function listArtifactVersions(
	sessionKey: string,
	artifactId: string
): Promise<ArtifactVersionSummary[]> {
	const sessionUuid = requireSessionUuid(sessionKey);
	const repoRoot = resolvePennyRepoRootFromEnv();
	await ensureArtifactFormatV5({ repoRoot, sessionUuid, artifactId });

	const versionNumbers = await listArtifactVersionNumbers(repoRoot, sessionUuid, artifactId);
	const summaries: ArtifactVersionSummary[] = [];

	for (const version of versionNumbers) {
		const pdfReady = await artifactPdfExists(sessionKey, artifactId, version);
		const snapshot = await readVersionSnapshot(sessionKey, artifactId, version);
		if (snapshot) {
			summaries.push(toVersionSummary(snapshot, pdfReady));
			continue;
		}
		const meta = await readArtifactMetaFile(sessionKey, artifactId);
		if (meta && version === meta.latestVersion) {
			summaries.push({
				version,
				title: meta.title,
				updatedAt: meta.updatedAt,
				pdfAvailable: pdfReady
			});
		}
	}

	return summaries;
}

export async function readArtifactPdfBytes(
	sessionKey: string,
	artifactId: string,
	version?: number
): Promise<Buffer> {
	const pdfPath = await resolveArtifactPdfReadPath(sessionKey, artifactId, version);
	if (!pdfPath) {
		throw new Error('pdf_not_available');
	}
	return readFile(pdfPath);
}

export async function artifactPdfExists(
	sessionKey: string,
	artifactId: string,
	version?: number
): Promise<boolean> {
	const pdfPath = await resolveArtifactPdfReadPath(sessionKey, artifactId, version);
	return pdfPath !== null;
}

async function resolveArtifactPdfReadPath(
	sessionKey: string,
	artifactId: string,
	version?: number
): Promise<string | null> {
	const sessionUuid = requireSessionUuid(sessionKey);
	const repoRoot = resolvePennyRepoRootFromEnv();
	const meta = await getArtifactMeta(sessionKey, artifactId);
	if (!meta) {
		return null;
	}
	const resolvedVersion = version ?? meta.latestVersion;
	if (!isValidArtifactVersion(resolvedVersion, meta.latestVersion)) {
		return null;
	}

	const paths = resolveArtifactPdfPaths(repoRoot, sessionUuid, artifactId, resolvedVersion);
	await repairVersionPdfFromLegacy(paths);
	return resolveReadableArtifactPdfPath(paths);
}

export async function getLatestSessionArtifact(sessionKey: string): Promise<ArtifactMeta | null> {
	const artifacts = await listSessionArtifacts(sessionKey);
	return artifacts[0] ?? null;
}

export async function deleteSessionArtifacts(sessionKey: string): Promise<void> {
	const sessionUuid = parsePennySessionUuid(sessionKey);
	if (!sessionUuid) {
		return;
	}

	const repoRoot = resolvePennyRepoRootFromEnv();
	const sessionArtifactsDir = resolveSessionArtifactsDir(repoRoot, sessionUuid);
	await rm(sessionArtifactsDir, { recursive: true, force: true });
}

function requireSessionUuid(sessionKey: string): string {
	const sessionUuid = parsePennySessionUuid(sessionKey);
	if (!sessionUuid) {
		throw new Error('invalid_session_key');
	}
	return sessionUuid;
}

export async function readArtifactMetaFile(
	sessionKey: string,
	artifactId: string
): Promise<ArtifactMeta | null> {
	const sessionUuid = parsePennySessionUuid(sessionKey);
	if (!sessionUuid || !isValidArtifactId(artifactId)) {
		return null;
	}

	const repoRoot = resolvePennyRepoRootFromEnv();
	try {
		await ensureArtifactFormatV5({ repoRoot, sessionUuid, artifactId });
	} catch {
		// Migration is best-effort; still attempt to read meta.json.
	}

	try {
		const metaPath = resolveArtifactFilePath(repoRoot, sessionUuid, artifactId, META_FILENAME);
		const raw = await readFile(metaPath, 'utf8');
		return normalizeWebArtifactMeta(JSON.parse(raw) as unknown);
	} catch {
		return null;
	}
}

async function readVersionSnapshot(
	sessionKey: string,
	artifactId: string,
	version: number
): Promise<ArtifactVersionSnapshot | null> {
	const sessionUuid = parsePennySessionUuid(sessionKey);
	if (!sessionUuid) {
		return null;
	}

	const repoRoot = resolvePennyRepoRootFromEnv();
	try {
		const snapshotPath = resolveArtifactVersionFilePath(
			repoRoot,
			sessionUuid,
			artifactId,
			version,
			VERSION_META_FILENAME
		);
		const raw = await readFile(snapshotPath, 'utf8');
		return JSON.parse(raw) as ArtifactVersionSnapshot;
	} catch {
		return null;
	}
}

function toVersionSummary(
	snapshot: ArtifactVersionSnapshot,
	pdfAvailable: boolean
): ArtifactVersionSummary {
	return {
		version: snapshot.version,
		title: snapshot.title,
		updatedAt: snapshot.createdAt,
		pdfAvailable,
		changeSummary: snapshot.changeSummary
	};
}

async function scanSessionArtifactMetas(sessionKey: string): Promise<ArtifactMeta[]> {
	const sessionUuid = parsePennySessionUuid(sessionKey);
	if (!sessionUuid) {
		return [];
	}

	const repoRoot = resolvePennyRepoRootFromEnv();
	const sessionDir = resolveSessionArtifactsDir(repoRoot, sessionUuid);
	let artifactDirs: string[] = [];
	try {
		const entries = await readdir(sessionDir, { withFileTypes: true });
		artifactDirs = entries
			.filter((entry) => entry.isDirectory() && isValidArtifactId(entry.name))
			.map((entry) => entry.name);
	} catch {
		return [];
	}

	const metas: ArtifactMeta[] = [];
	for (const artifactId of artifactDirs) {
		const meta = await readArtifactMetaFile(sessionKey, artifactId);
		if (meta) {
			metas.push(meta);
		}
	}
	return metas;
}
