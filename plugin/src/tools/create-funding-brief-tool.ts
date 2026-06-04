import { createHash } from "node:crypto";

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

const LOCAL_PENNY_SESSION_PREFIX = "penny-";
const AGENT_SCOPED_SESSION_HEAD = "agent";
const SESSION_KEY_SEPARATOR = ":";
const AGENT_SESSION_KEY_MIN_PARTS = 3;
const AGENT_SESSION_REST_START_INDEX = 2;
const HASH_ALGORITHM = "sha256";
const HASH_ENCODING = "hex";
const HEX_RADIX = 16;
const UUID_PART_ONE_END = 8;
const UUID_PART_TWO_END = 12;
const UUID_PART_THREE_SUFFIX_START = 13;
const UUID_PART_THREE_END = 16;
const UUID_PART_FOUR_VARIANT_START = 16;
const UUID_PART_FOUR_SUFFIX_START = 17;
const UUID_PART_FOUR_END = 20;
const UUID_PART_FIVE_END = 32;
const UUID_VERSION_NIBBLE = "4";
const UUID_VARIANT_CLEAR_MASK = 0x3;
const UUID_VARIANT_SET_MASK = 0x8;

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
  changeSummary: Type.Optional(
    Type.String({
      description:
        "One sentence describing what changed in this revision (recommended on updates).",
    }),
  ),
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

function localSessionUuid(sessionKey: string): string | null {
  const candidate = localSessionCandidate(sessionKey);
  if (!candidate.startsWith(LOCAL_PENNY_SESSION_PREFIX)) {
    return null;
  }

  const hash = createHash(HASH_ALGORITHM).update(candidate).digest(HASH_ENCODING);
  const variantNibble =
    (Number.parseInt(hash.slice(UUID_PART_FOUR_VARIANT_START, UUID_PART_FOUR_SUFFIX_START), HEX_RADIX) &
      UUID_VARIANT_CLEAR_MASK) |
    UUID_VARIANT_SET_MASK;

  return [
    hash.slice(0, UUID_PART_ONE_END),
    hash.slice(UUID_PART_ONE_END, UUID_PART_TWO_END),
    `${UUID_VERSION_NIBBLE}${hash.slice(UUID_PART_THREE_SUFFIX_START, UUID_PART_THREE_END)}`,
    `${variantNibble.toString(HEX_RADIX)}${hash.slice(UUID_PART_FOUR_SUFFIX_START, UUID_PART_FOUR_END)}`,
    hash.slice(UUID_PART_FOUR_END, UUID_PART_FIVE_END),
  ].join("-");
}

function localSessionCandidate(sessionKey: string): string {
  const trimmed = sessionKey.trim();
  const parts = trimmed.split(SESSION_KEY_SEPARATOR).filter((part) => part.length > 0);
  if (
    parts.length >= AGENT_SESSION_KEY_MIN_PARTS &&
    parts[0]?.toLowerCase() === AGENT_SCOPED_SESSION_HEAD
  ) {
    return parts.slice(AGENT_SESSION_REST_START_INDEX).join(SESSION_KEY_SEPARATOR);
  }
  return trimmed;
}

function resolveArtifactSessionUuid(sessionKey: string | undefined): string | null {
  const webSessionUuid = parsePennySessionUuid(sessionKey ?? "");
  if (webSessionUuid) {
    return webSessionUuid;
  }
  return sessionKey ? localSessionUuid(sessionKey) : null;
}

export function createFundingBriefTool(
  config: PennyToolsConfigShape,
  sessionKey: string | undefined,
): AnyAgentTool {
  return {
    ...createFundingBriefToolDefinition,
    execute: async (_toolCallId, params, signal) => {
      const sessionUuid = resolveArtifactSessionUuid(sessionKey);
      if (!sessionUuid) {
        return toToolJsonResult({
          success: false,
          error: "invalid_session_key",
          message:
            "Funding artifacts require a Penny web chat session or local penny-* session.",
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
