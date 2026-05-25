import type { ProgramProfile } from "../domain/corpus-types.js";
import {
  collectProgramTextFields,
  PROGRAM_KEYWORD_HAYSTACK_FIELDS,
} from "../domain/program-fields.js";
import { joinNormalizedHaystack, normalizeToken } from "./text-normalize.js";

export function sanitizeKeywords(words: readonly string[]): string[] {
  const sanitized: string[] = [];
  const seen = new Set<string>();

  for (const fragment of words) {
    const trimmed = normalizeToken(fragment);

    if (trimmed === "" || seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    sanitized.push(trimmed);
  }

  return sanitized;
}

function escapedWordRegex(token: string): RegExp {
  const escaped = token.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&");
  return RegExp(`\\b${escaped}\\b`, "gi");
}

export function corpusKeywordOverlapScore(row: ProgramProfile, keywords: readonly string[]): number {
  if (keywords.length === 0) {
    return 0;
  }

  const haystack = joinNormalizedHaystack(
    collectProgramTextFields(row, PROGRAM_KEYWORD_HAYSTACK_FIELDS),
  );

  let hits = 0;

  for (const kw of keywords) {
    const pattern = escapedWordRegex(kw);
    const matched = haystack.match(pattern);

    if (matched) {
      hits += matched.length;
    }
  }

  return hits;
}
