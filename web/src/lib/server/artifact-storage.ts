import { readFile, readdir, rm, stat } from 'node:fs/promises';

import {
	META_FILENAME,
	PDF_FILENAME,
	isValidArtifactId,
	resolveArtifactFilePath,
	resolveSessionArtifactIndexPath,
	resolveSessionArtifactsDir
} from '@penny/shared/penny-paths';

import { parsePennySessionUuid } from '$lib/server/session-key.js';
import { resolvePennyRepoRootFromEnv } from '$lib/server/penny-config.js';
import type { ArtifactSummary } from '$lib/chat/artifacts.js';

export type ArtifactMeta = {
	artifactId: string;
	sessionUuid: string;
	title: string;
	programCount: number;
	version: number;
	triggerReason: 'auto' | 'user_requested';
	createdAt: string;
	updatedAt: string;
	pdfAvailable?: boolean;
};

export function toArtifactSummary(meta: ArtifactMeta): ArtifactSummary {
	return {
		artifactId: meta.artifactId,
		title: meta.title,
		programCount: meta.programCount,
		version: meta.version,
		updatedAt: meta.updatedAt,
		pdfAvailable: meta.pdfAvailable ?? true
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
		indexEntries = JSON.parse(raw) as ArtifactMeta[];
	} catch {
		indexEntries = [];
	}

	return mergeArtifactMetas(indexEntries, await scanSessionArtifactMetas(sessionKey));
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

export async function readArtifactPdfBytes(
	sessionKey: string,
	artifactId: string
): Promise<Buffer> {
	const sessionUuid = requireSessionUuid(sessionKey);
	const repoRoot = resolvePennyRepoRootFromEnv();
	const pdfPath = resolveArtifactFilePath(repoRoot, sessionUuid, artifactId, PDF_FILENAME);
	return readFile(pdfPath);
}

export async function artifactPdfExists(sessionKey: string, artifactId: string): Promise<boolean> {
	const sessionUuid = requireSessionUuid(sessionKey);
	const repoRoot = resolvePennyRepoRootFromEnv();
	const pdfPath = resolveArtifactFilePath(repoRoot, sessionUuid, artifactId, PDF_FILENAME);
	try {
		const fileStat = await stat(pdfPath);
		return fileStat.isFile() && fileStat.size > 0;
	} catch {
		return false;
	}
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
		const metaPath = resolveArtifactFilePath(repoRoot, sessionUuid, artifactId, META_FILENAME);
		const raw = await readFile(metaPath, 'utf8');
		return JSON.parse(raw) as ArtifactMeta;
	} catch {
		return null;
	}
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

function mergeArtifactMetas(indexEntries: ArtifactMeta[], diskEntries: ArtifactMeta[]): ArtifactMeta[] {
	const byId = new Map<string, ArtifactMeta>();
	for (const entry of diskEntries) {
		byId.set(entry.artifactId, entry);
	}
	for (const entry of indexEntries) {
		byId.set(entry.artifactId, entry);
	}
	return [...byId.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}
