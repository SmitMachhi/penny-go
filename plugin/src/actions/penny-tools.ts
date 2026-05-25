import { READ_OFFICIAL_SOURCE_TIMEOUT_MS } from "../constants.js";
import {
  type PennyToolsConfigShape,
  readerScriptPath,
  resolveCorpusPath,
  resolvePython,
  resolveRepoRoot,
} from "../penny-config.js";
import { filterAndRankPrograms, type SearchCorpusParams } from "../search-corpus-rank.js";
import { loadProgramsFromFile } from "../search-corpus-load.js";
import { runJsonStdinSubprocess } from "../services/subprocess-json.js";

export async function searchCorpusAction(
  config: PennyToolsConfigShape,
  params: SearchCorpusParams,
) {
  const corpusFile = resolveCorpusPath(config);
  const programs = await loadProgramsFromFile(corpusFile);
  const matches = filterAndRankPrograms(programs, params);

  return {
    corpus_path: corpusFile,
    match_count: matches.length,
    programs: matches,
  };
}

export async function readOfficialSourceAction(
  config: PennyToolsConfigShape,
  url: string,
  signal?: AbortSignal | undefined,
) {
  const repoRoot = resolveRepoRoot(config);
  const outcome = await runJsonStdinSubprocess({
    command: resolvePython(config),
    args: [readerScriptPath(repoRoot)],
    payload: { url },
    timeoutMs: READ_OFFICIAL_SOURCE_TIMEOUT_MS,
    signal,
  });

  if (!outcome.parsed) {
    return {
      success: false as const,
      error: outcome.stderr || "empty_or_invalid_stdout",
    };
  }

  return outcome.parsed;
}
