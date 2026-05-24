import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { env } from '$env/dynamic/private';

const WORKSPACE_SEGMENT = 'workspace';

export function resolvePennyRepoRoot(): string {
	const fromEnv = env.PENNY_REPO_ROOT?.trim();
	if (fromEnv) {
		return resolve(fromEnv);
	}

	const cwd = process.cwd();
	const candidates = [cwd, resolve(cwd, '..')];
	for (const candidate of candidates) {
		if (existsSync(resolve(candidate, WORKSPACE_SEGMENT))) {
			return candidate;
		}
	}

	throw new Error('PENNY_REPO_ROOT is required when workspace path cannot be inferred');
}

export function resolveWorkspaceRoot(): string {
	return resolve(resolvePennyRepoRoot(), WORKSPACE_SEGMENT);
}
