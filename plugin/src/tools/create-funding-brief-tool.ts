import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import { parsePennySessionUuid } from "@penny/shared/session-key";
import { validateCreateFundingArtifactInput } from "@penny/shared/artifact-validation";

import { createFundingBriefAction } from "../actions/funding-brief-tools.js";
import type { PennyToolsConfigShape } from "../services/penny-config.js";
import { toToolJsonResult } from "../services/tool-result.js";

const confidenceSchema = Type.Union([
  Type.Literal("verified_live"),
  Type.Literal("newly_discovered"),
  Type.Literal("could_not_verify"),
]);

const evidenceProgramSchema = Type.Object({
  name: Type.String(),
  officialUrl: Type.String(),
  confidence: confidenceSchema,
});

export const createFundingBriefParameters = Type.Object({
  title: Type.String(),
  triggerReason: Type.Union([Type.Literal("auto"), Type.Literal("user_requested")]),
  bodyMarkdown: Type.String({
    description:
      "Full funding brief + strategy in markdown. Lead with brief and programs; follow with execution checklists and steps. Use GFM tables, bullets, and - [ ] task lists.",
  }),
  artifactId: Type.Optional(
    Type.String({ description: "Existing artifact UUID to update in place" }),
  ),
  evidence: Type.Optional(
    Type.Object({
      programs: Type.Optional(Type.Array(evidenceProgramSchema)),
    }),
  ),
  programs: Type.Optional(
    Type.Array(evidenceProgramSchema, {
      description: "Deprecated alias for evidence.programs — audit only, not rendered into PDF.",
    }),
  ),
  verification: Type.Object({
    verifiedAt: Type.String(),
    urlsChecked: Type.Array(Type.String()),
    notes: Type.Optional(Type.String()),
  }),
});

export const createFundingBriefToolDefinition = {
  name: "create_funding_brief",
  label: "Create funding artifact",
  description:
    "Create or update a funding brief and strategy PDF for the active chat session. Write the full document in bodyMarkdown; PDF is generated from that markdown.",
  parameters: createFundingBriefParameters,
} as const;

function readOptionalArtifactId(params: unknown): string | undefined {
  if (typeof params !== "object" || params === null) {
    return undefined;
  }
  const artifactId = (params as Record<string, unknown>).artifactId;
  if (typeof artifactId !== "string") {
    return undefined;
  }
  const trimmed = artifactId.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function createFundingBriefTool(
  config: PennyToolsConfigShape,
  sessionKey: string | undefined,
): AnyAgentTool {
  return {
    ...createFundingBriefToolDefinition,
    execute: async (_toolCallId, params, signal) => {
      const sessionUuid = parsePennySessionUuid(sessionKey ?? "");
      if (!sessionUuid) {
        return toToolJsonResult({
          success: false,
          error: "invalid_session_key",
          message:
            "Funding artifacts require a Penny web chat session (agent:main:penny:<uuid>).",
        });
      }

      const validation = validateCreateFundingArtifactInput(params);
      if (!validation.ok) {
        return toToolJsonResult({
          success: false,
          error: "validation_failed",
          details: validation.errors,
        });
      }

      const artifactId = readOptionalArtifactId(params);

      const result = await createFundingBriefAction(
        config,
        {
          ...validation.value,
          sessionUuid,
          artifactId,
        },
        signal,
      );
      return toToolJsonResult(result);
    },
  };
}
