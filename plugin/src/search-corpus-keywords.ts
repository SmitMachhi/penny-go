import type { ProgramProfile } from "./corpus-types.js";

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

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

function normalizeHaystack(parts: readonly (string | undefined)[]): string {
  return normalizeToken(parts.filter(Boolean).join(" "));
}

export function corpusKeywordOverlapScore(row: ProgramProfile, keywords: readonly string[]): number {
  if (keywords.length === 0) {
    return 0;
  }

  const haystack = normalizeHaystack([
    row.program_name,
    row.program_type,
    row.eligible_applicants,
    row.eligible_projects,
    row.funding_amount,
    row.deadline_or_intake,
    row.status,
    row.provider,
  ]);

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
