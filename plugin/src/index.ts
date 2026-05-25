import { Type } from "@sinclair/typebox";
import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";

import { createFundingBriefAction } from "./actions/funding-brief-tools.js";
import {
  readOfficialSourceAction,
  searchCorpusAction,
} from "./actions/penny-tools.js";
import type { PennyToolsConfigShape } from "./services/penny-config.js";

const confidenceSchema = Type.Union([
  Type.Literal("verified_live"),
  Type.Literal("newly_discovered"),
  Type.Literal("could_not_verify"),
]);

const programSchema = Type.Object({
  name: Type.String(),
  whyFit: Type.String(),
  whyNot: Type.String(),
  benefitType: Type.String(),
  intakeStatus: Type.String(),
  officialUrl: Type.String(),
  confidence: confidenceSchema,
  nextStep: Type.String(),
});

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
          description: "Official https URL from corpus source_urls or web_search",
        }),
      }),
      execute: async (params, cfg, runtime) =>
        readOfficialSourceAction(cfg as PennyToolsConfigShape, params.url.trim(), runtime.signal),
    }),
    tool({
      name: "create_funding_brief",
      label: "Create funding brief artifact",
      description:
        "Create or update a branded funding brief slideshow and PDF artifact for the active session.",
      parameters: Type.Object({
        sessionUuid: Type.String({ description: "UUID from agent:main:penny:<uuid> session key" }),
        title: Type.String(),
        triggerReason: Type.Union([Type.Literal("auto"), Type.Literal("user_requested")]),
        artifactId: Type.Optional(
          Type.String({ description: "Existing artifact UUID to update in place" }),
        ),
        business: Type.Object({
          name: Type.Optional(Type.String()),
          province: Type.Optional(Type.String()),
          sector: Type.Optional(Type.String()),
          employees: Type.Optional(Type.String()),
          projectSummary: Type.Optional(Type.String()),
        }),
        programs: Type.Array(programSchema),
        verification: Type.Object({
          verifiedAt: Type.String(),
          urlsChecked: Type.Array(Type.String()),
          notes: Type.Optional(Type.String()),
        }),
      }),
      execute: async (params, cfg, runtime) =>
        createFundingBriefAction(cfg as PennyToolsConfigShape, params, runtime.signal),
    }),
  ],
});
