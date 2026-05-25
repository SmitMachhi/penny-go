import { readFile, rm, stat } from 'node:fs/promises';

import {
	META_FILENAME,
	PDF_FILENAME,
	SLIDES_FILENAME,
	resolveArtifactFilePath,
	resolveSessionArtifactIndexPath,
	resolveSessionArtifactsDir
} from '@penny/shared/penny-paths';

import { parsePennySessionUuid } from '$lib/server/session-key.js';
import { resolvePennyRepoRootFromEnv } from '$lib/server/penny-config.js';

export type ArtifactMeta = {
	artifactId: string;
	sessionUuid: string;
	title: string;
	programCount: number;
	version: number;
	triggerReason: 'auto' | 'user_requested';
	createdAt: string;
	updatedAt: string;
};

export async function listSessionArtifacts(sessionKey: string): Promise<ArtifactMeta[]> {
	const sessionUuid = parsePennySessionUuid(sessionKey);
	if (!sessionUuid) {
		return [];
	}

	const repoRoot = resolvePennyRepoRootFromEnv();
	const indexPath = resolveSessionArtifactIndexPath(repoRoot, sessionUuid);
	try {
		const raw = await readFile(indexPath, 'utf8');
		return JSON.parse(raw) as ArtifactMeta[];
	} catch {
		return [];
	}
}

export async function getArtifactMeta(
	sessionKey: string,
	artifactId: string
): Promise<ArtifactMeta | null> {
	const artifacts = await listSessionArtifacts(sessionKey);
	return artifacts.find((entry) => entry.artifactId === artifactId) ?? null;
}

export async function readArtifactSlidesHtml(
	sessionKey: string,
	artifactId: string
): Promise<string> {
	const sessionUuid = requireSessionUuid(sessionKey);
	const repoRoot = resolvePennyRepoRootFromEnv();
	const slidesPath = resolveArtifactFilePath(repoRoot, sessionUuid, artifactId, SLIDES_FILENAME);
	return readFile(slidesPath, 'utf8');
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
	if (!sessionUuid) {
		return null;
	}

	const repoRoot = resolvePennyRepoRootFromEnv();
	const metaPath = resolveArtifactFilePath(repoRoot, sessionUuid, artifactId, META_FILENAME);
	try {
		const raw = await readFile(metaPath, 'utf8');
		return JSON.parse(raw) as ArtifactMeta;
	} catch {
		return null;
	}
}
