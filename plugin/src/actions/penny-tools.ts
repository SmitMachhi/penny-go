import {
	READ_OFFICIAL_SOURCE_HTML_TIMEOUT_MS,
	READ_OFFICIAL_SOURCE_TIMEOUT_MS
} from '../constants.js';
import { filterAndRankPrograms, type SearchCorpusParams } from '../domain/corpus-search.js';
import { appendOfficialBenefitScope } from '../domain/official-benefit-scope.js';
import {
	type PennyToolsConfigShape,
	resolveExaApiKey,
	readerScriptPath,
	resolveCorpusPath,
	resolvePython,
	resolveRepoRoot
} from '../services/penny-config.js';
import { loadProgramsFromFile } from '../services/corpus-load.js';
import { runJsonStdinSubprocess } from '../services/subprocess-json.js';
import { readExaOfficialContents } from '../services/exa-contents.js';
import { readOfficialSourceWithFallback } from '../services/official-source-reader.js';

export type { SearchCorpusParams };

export async function searchCorpusAction(
	config: PennyToolsConfigShape,
	params: SearchCorpusParams
) {
	const corpusFile = resolveCorpusPath(config);
	const programs = await loadProgramsFromFile(corpusFile);
	const matches = filterAndRankPrograms(programs, params);

	return {
		corpus_path: corpusFile,
		match_count: matches.length,
		programs: matches
	};
}

export async function readOfficialSourceAction(
	config: PennyToolsConfigShape,
	url: string,
	signal?: AbortSignal | undefined
) {
	const repoRoot = resolveRepoRoot(config);
	const result = await readOfficialSourceWithFallback({
		url,
		config,
		exaApiKey: resolveExaApiKey(config),
		htmlTimeoutMs: READ_OFFICIAL_SOURCE_HTML_TIMEOUT_MS,
		pdfTimeoutMs: READ_OFFICIAL_SOURCE_TIMEOUT_MS,
		signal,
		readWithCrawl4Ai: async (input) => {
			const outcome = await runJsonStdinSubprocess({
				command: resolvePython(config),
				args: [readerScriptPath(repoRoot)],
				payload: { url: input.url },
				timeoutMs: input.timeoutMs,
				signal: input.signal
			});

			if (!outcome.parsed) {
				return {
					success: false,
					url: input.url,
					error: outcome.stderr || 'empty_or_invalid_stdout'
				};
			}

			return outcome.parsed;
		},
		readWithExaContents: async (input) =>
			readExaOfficialContents({
				url: input.url,
				apiKey: input.apiKey,
				signal: input.signal
			})
	});
	return appendOfficialBenefitScope(result);
}
