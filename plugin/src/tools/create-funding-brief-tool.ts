import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import { parsePennySessionUuid } from "@penny/shared/session-key";
import { validateFundingBriefContent } from "@penny/shared/funding-brief";

import { createFundingBriefAction } from "../actions/funding-brief-tools.js";
import type { PennyToolsConfigShape } from "../services/penny-config.js";
import { toToolJsonResult } from "../services/tool-result.js";

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

export const createFundingBriefParameters = Type.Object({
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
});

export const createFundingBriefToolDefinition = {
  name: "create_funding_brief",
  label: "Create funding brief artifact",
  description:
    "Create or update a branded funding brief slideshow and PDF artifact for the active chat session.",
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
            "Funding brief artifacts require a Penny web chat session (agent:main:penny:<uuid>).",
        });
      }

      const validation = validateFundingBriefContent(params);
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
