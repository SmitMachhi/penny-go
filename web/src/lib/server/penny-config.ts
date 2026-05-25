import { resolvePennyRepoRoot, resolveWorkspaceRoot as sharedWorkspaceRoot } from '@penny/shared/penny-paths';
import { env } from '$env/dynamic/private';

export function resolvePennyRepoRootFromEnv(): string {
	return resolvePennyRepoRoot({
		envRoot: env.PENNY_REPO_ROOT,
		allowCwdInference: true
	});
}

export function resolveWorkspaceRoot(): string {
	return sharedWorkspaceRoot(resolvePennyRepoRootFromEnv());
}
