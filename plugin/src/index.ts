import path from "node:path";

import { Type } from "@sinclair/typebox";
import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";

import { CORPUS_SEGMENTS_RELATIVE } from "./constants.js";
import { filterAndRankPrograms, loadProgramsFromFile } from "./search-corpus.js";
import { readOfficialPageContent, type PennyToolsConfigShape } from "./read-official-source.js";

const configSchema = Type.Object(
  {
    corpusPath: Type.Optional(
      Type.String({ description: "Absolute path to verified-programs.jsonl" }),
    ),
    pythonPath: Type.Optional(
      Type.String({ description: "Python interpreter for read_official_source.py" }),
    ),
    repoRoot: Type.Optional(Type.String({ description: "penny-go repo root" })),
  },
  { additionalProperties: false },
);

function resolveRepoRoot(config: PennyToolsConfigShape): string {
  const fromConfig = config.repoRoot?.trim();
  const fromEnv = process.env.PENNY_REPO_ROOT?.trim();

  if (fromConfig) {
    return path.resolve(fromConfig);
  }

  if (fromEnv) {
    return path.resolve(fromEnv);
  }

  throw new Error("missing_repo_root: set repoRoot plugin config or PENNY_REPO_ROOT");
}

function resolveCorpusPath(config: PennyToolsConfigShape): string {
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

export default defineToolPlugin({
  id: "penny-tools",
  name: "Penny Tools",
  description: "Search verified Canadian business funding corpus and read live official URLs.",
  configSchema,
  tools: (tool) => [
    tool({
      name: "search_corpus",
      label: "Search funding corpus",
      description:
        "Search Penny curated verified-programs JSONL. Always call this before web_search.",
      parameters: Type.Object({
        jurisdiction: Type.Optional(
          Type.String({ description: "Lowercase slug e.g. ontario, federal" }),
        ),
        keywords: Type.Optional(
          Type.Array(Type.String({ description: "Keyword tokens for overlap scoring" })),
        ),
        program_type: Type.Optional(Type.String()),
        include_federal: Type.Optional(Type.Boolean()),
      }),
      execute: async (params, cfg) => {
        const corpusFile = resolveCorpusPath(cfg);
        const programs = await loadProgramsFromFile(corpusFile);

        const matches = filterAndRankPrograms(programs, {
          jurisdiction: params.jurisdiction,
          keywords: params.keywords,
          program_type: params.program_type,
          include_federal: params.include_federal,
        });

        return {
          corpus_path: corpusFile,
          match_count: matches.length,
          programs: matches,
        };
      },
    }),
    tool({
      name: "read_official_source",
      label: "Read official source",
      description:
        "Fetch live HTTPS page or PDF via Crawl4AI. Required before recommending any program.",
      parameters: Type.Object({
        url: Type.String({
          description: "Official https URL from corpus source_urls or web_search",
        }),
      }),
      execute: async (params, cfg, runtime) => {
        const mergedConfig: PennyToolsConfigShape = cfg;
        const outcome = await readOfficialPageContent(
          mergedConfig,
          params.url.trim(),
          runtime.signal,
        );

        if (!outcome.parsed) {
          return {
            success: false,
            error: outcome.stderr || "empty_or_invalid_stdout",
          };
        }

        return outcome.parsed;
      },
    }),
  ],
});
