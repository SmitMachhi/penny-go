import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import { Type } from "@sinclair/typebox";

import {
  readOfficialSourceAction,
  searchCorpusAction,
} from "./actions/penny-tools.js";
import type { PennyToolsConfigShape } from "./services/penny-config.js";
import { createFundingBriefTool, createFundingBriefToolDefinition } from "./tools/create-funding-brief-tool.js";
import { publishFundingBriefTool, publishFundingBriefToolDefinition } from "./tools/publish-funding-brief-tool.js";

const configSchema = Type.Object(
  {
    corpusPath: Type.Optional(
      Type.String({ description: "Absolute path to verified-programs.jsonl" }),
    ),
    firecrawlApiKey: Type.Optional(
      Type.String({ description: "Firecrawl API key for read_official_source fallback" }),
    ),
    pythonPath: Type.Optional(
      Type.String({ description: "Python interpreter for read_official_source.py" }),
    ),
    repoRoot: Type.Optional(Type.String({ description: "penny-go repo root" })),
  },
  { additionalProperties: false },
);

export default defineToolPlugin({
  id: "penny-tools",
  name: "Penny Tools",
  description: "Search verified Canadian business funding database and read live official URLs.",
  configSchema,
  tools: (tool) => [
    tool({
      name: "search_corpus",
      label: "Search funding database",
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
      execute: async (params, cfg) =>
        searchCorpusAction(cfg as PennyToolsConfigShape, {
          jurisdiction: params.jurisdiction,
          keywords: params.keywords,
          program_type: params.program_type,
          include_federal: params.include_federal,
        }),
    }),
    tool({
      name: "read_official_source",
      label: "Read official source",
      description:
        "Fetch live HTTPS page or PDF via Crawl4AI. Required before recommending any program.",
      parameters: Type.Object({
        url: Type.String({
          description: "Official https URL from database source_urls or web_search",
        }),
      }),
      execute: async (params, cfg, runtime) =>
        readOfficialSourceAction(cfg as PennyToolsConfigShape, params.url.trim(), runtime.signal),
    }),
    tool({
      ...createFundingBriefToolDefinition,
      factory: ({ config, toolContext }) =>
        createFundingBriefTool(
          config as PennyToolsConfigShape,
          toolContext.sessionKey,
        ) as unknown as AnyAgentTool,
    }),
    tool({
      ...publishFundingBriefToolDefinition,
      factory: ({ config, toolContext }) =>
        publishFundingBriefTool(
          config as PennyToolsConfigShape,
          toolContext.sessionKey,
        ) as unknown as AnyAgentTool,
    }),
  ],
});
