import path from 'node:path';

import { resolvePennyRepoRoot } from '@penny/shared/penny-paths';

import { CORPUS_SEGMENTS_RELATIVE } from '../constants.js';

const ENV_SECRET_PREFIX = 'env:';

export type PennyToolsConfigShape = {
	corpusPath?: string | undefined;
	exaApiKey?: string | undefined;
	pythonPath?: string | undefined;
	repoRoot?: string | undefined;
};

export function resolveRepoRoot(config: PennyToolsConfigShape): string {
	return resolvePennyRepoRoot({
		configRoot: config.repoRoot,
		envRoot: process.env.PENNY_REPO_ROOT,
		allowCwdInference: false
	});
}

export function resolvePython(config: PennyToolsConfigShape): string {
	return config.pythonPath?.trim() ?? process.env.PENNY_PYTHON?.trim() ?? 'python3';
}

export function resolveExaApiKey(config: PennyToolsConfigShape): string | undefined {
	const configured = config.exaApiKey?.trim();
	if (configured?.startsWith(ENV_SECRET_PREFIX)) {
		const envName = configured.slice(ENV_SECRET_PREFIX.length).trim();
		return envName ? process.env[envName]?.trim() || undefined : undefined;
	}
	return configured || process.env.EXA_API_KEY?.trim() || undefined;
}

export function resolveCorpusPath(config: PennyToolsConfigShape): string {
	const fromConfig = config.corpusPath?.trim();
	const fromEnv = process.env.PENNY_CORPUS_PATH?.trim();

	if (fromConfig) {
		return path.resolve(fromConfig);
	}

	if (fromEnv) {
		return path.resolve(fromEnv);
	}

	const repoRoot = resolveRepoRoot(config);
	return path.join(repoRoot, ...CORPUS_SEGMENTS_RELATIVE);
}

export function readerScriptPath(repoRoot: string): string {
	return path.join(repoRoot, 'tools', 'read_official_source.py');
}
