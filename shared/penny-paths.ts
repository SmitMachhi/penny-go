import { existsSync } from 'node:fs';
import { relative, resolve } from 'node:path';

import { isValidSessionUuid } from '#session-key';

export const WORKSPACE_SEGMENT = 'workspace';

export type ResolvePennyRepoRootOptions = {
	configRoot?: string | undefined;
	envRoot?: string | undefined;
	cwd?: string;
	allowCwdInference?: boolean;
};

export function resolvePennyRepoRoot(options: ResolvePennyRepoRootOptions = {}): string {
	const configRoot = options.configRoot?.trim();
	if (configRoot) {
		return resolve(configRoot);
	}

	const envRoot = options.envRoot?.trim();
	if (envRoot) {
		return resolve(envRoot);
	}

	if (options.allowCwdInference !== false) {
		const cwd = options.cwd ?? process.cwd();
		const candidates = [cwd, resolve(cwd, '..')];
		for (const candidate of candidates) {
			if (existsSync(resolve(candidate, WORKSPACE_SEGMENT))) {
				return candidate;
			}
		}
	}

	throw new Error('missing_repo_root: set repoRoot or PENNY_REPO_ROOT');
}

export function resolveWorkspaceRoot(repoRoot: string): string {
	return resolve(repoRoot, WORKSPACE_SEGMENT);
}

export const ARTIFACTS_SEGMENT = 'artifacts';
export const VERSIONS_DIR = 'versions';
export const DOCUMENT_MD_FILENAME = 'document.md';
export const PDF_FILENAME = 'brief.pdf';
export const META_FILENAME = 'meta.json';
export const VERSION_META_FILENAME = 'meta.snapshot.json';
export const INDEX_FILENAME = 'index.json';
/** @deprecated Legacy artifacts only — migrate to document.md + meta.json */
export const LEGACY_BRIEF_FILENAME = 'brief.json';
/** @deprecated Legacy artifacts only — delete after PDF migration */
export const LEGACY_SLIDES_FILENAME = 'slides.html';

const ARTIFACT_ID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export { isValidSessionUuid } from '#session-key';

export function isValidArtifactId(value: string): boolean {
	return ARTIFACT_ID_PATTERN.test(value);
}

export function resolveArtifactsRoot(repoRoot: string): string {
	return resolve(resolveWorkspaceRoot(repoRoot), ARTIFACTS_SEGMENT);
}

export function resolveSessionArtifactsDir(repoRoot: string, sessionUuid: string): string {
	if (!isValidSessionUuid(sessionUuid)) {
		throw new Error('invalid_session_uuid');
	}

	const artifactsRoot = resolveArtifactsRoot(repoRoot);
	const sessionDir = resolve(artifactsRoot, sessionUuid);
	assertSafeChildPath(artifactsRoot, sessionDir);
	return sessionDir;
}

export function resolveArtifactDir(
	repoRoot: string,
	sessionUuid: string,
	artifactId: string
): string {
	if (!isValidArtifactId(artifactId)) {
		throw new Error('invalid_artifact_id');
	}

	const sessionDir = resolveSessionArtifactsDir(repoRoot, sessionUuid);
	const artifactDir = resolve(sessionDir, artifactId);
	assertSafeChildPath(sessionDir, artifactDir);
	return artifactDir;
}

export function resolveSessionArtifactIndexPath(repoRoot: string, sessionUuid: string): string {
	return resolve(resolveSessionArtifactsDir(repoRoot, sessionUuid), INDEX_FILENAME);
}

export function resolveArtifactFilePath(
	repoRoot: string,
	sessionUuid: string,
	artifactId: string,
	filename: string
): string {
	const artifactDir = resolveArtifactDir(repoRoot, sessionUuid, artifactId);
	const filePath = resolve(artifactDir, filename);
	assertSafeChildPath(artifactDir, filePath);
	return filePath;
}

export function formatArtifactVersionSegment(version: number): string {
	if (!Number.isInteger(version) || version < 1) {
		throw new Error('invalid_artifact_version');
	}
	return String(version);
}

export function resolveArtifactVersionDir(
	repoRoot: string,
	sessionUuid: string,
	artifactId: string,
	version: number
): string {
	const artifactDir = resolveArtifactDir(repoRoot, sessionUuid, artifactId);
	const versionsRoot = resolve(artifactDir, VERSIONS_DIR);
	const versionDir = resolve(versionsRoot, formatArtifactVersionSegment(version));
	assertSafeChildPath(artifactDir, versionsRoot);
	assertSafeChildPath(versionsRoot, versionDir);
	return versionDir;
}

export function resolveArtifactVersionFilePath(
	repoRoot: string,
	sessionUuid: string,
	artifactId: string,
	version: number,
	filename: string
): string {
	const versionDir = resolveArtifactVersionDir(repoRoot, sessionUuid, artifactId, version);
	const filePath = resolve(versionDir, filename);
	assertSafeChildPath(versionDir, filePath);
	return filePath;
}

function assertSafeChildPath(parentDir: string, targetPath: string): void {
	const relativePath = relative(parentDir, targetPath);
	if (relativePath.startsWith('..') || relativePath.includes('..')) {
		throw new Error('path_traversal_rejected');
	}
}
