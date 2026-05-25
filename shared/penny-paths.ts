import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

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
