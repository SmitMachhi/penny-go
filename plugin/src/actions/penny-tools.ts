import {
	READ_OFFICIAL_SOURCE_HTML_TIMEOUT_MS,
	READ_OFFICIAL_SOURCE_TIMEOUT_MS
} from '../constants.js';
import { filterAndRankPrograms, type SearchCorpusParams } from '../domain/corpus-search.js';
import {
	type PennyToolsConfigShape,
	resolveFirecrawlApiKey,
	readerScriptPath,
	resolveCorpusPath,
	resolvePython,
	resolveRepoRoot
} from '../services/penny-config.js';
import { loadProgramsFromFile } from '../services/corpus-load.js';
import { runJsonStdinSubprocess } from '../services/subprocess-json.js';
import { readFirecrawlScrape } from '../services/firecrawl-scrape.js';
import {
	readOfficialSourceWithFallback,
	logOfficialSourceReadDiagnostics,
	redactOfficialSourceResultForModel
} from '../services/official-source-reader.js';

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
	const { result, diagnostics } = await readOfficialSourceWithFallback({
		url,
		config,
		firecrawlApiKey: resolveFirecrawlApiKey(config),
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
		readWithFirecrawlScrape: async (input) =>
			readFirecrawlScrape({
				url: input.url,
				apiKey: input.apiKey,
				signal: input.signal
			})
	});
	logOfficialSourceReadDiagnostics(diagnostics);
	return redactOfficialSourceResultForModel(result);
}
