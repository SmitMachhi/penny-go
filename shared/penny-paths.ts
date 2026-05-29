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
export const BRIEF_FILENAME = 'brief.json';
export const SLIDES_FILENAME = 'slides.html';
export const PDF_FILENAME = 'brief.pdf';
export const META_FILENAME = 'meta.json';
export const INDEX_FILENAME = 'index.json';

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

function assertSafeChildPath(parentDir: string, targetPath: string): void {
	const relativePath = relative(parentDir, targetPath);
	if (relativePath.startsWith('..') || relativePath.includes('..')) {
		throw new Error('path_traversal_rejected');
	}
}
