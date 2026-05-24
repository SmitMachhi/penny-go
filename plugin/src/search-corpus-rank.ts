import { MAX_CORPUS_RESULTS } from "./constants.js";
import type { ProgramProfile, SearchCorpusResultRow } from "./corpus-types.js";
import { textLooksLoanBacked } from "./loan-filter.js";
import { corpusKeywordOverlapScore, sanitizeKeywords } from "./search-corpus-keywords.js";

export type SearchCorpusParams = {
  jurisdiction?: string | undefined;
  keywords?: readonly string[] | undefined;
  program_type?: string | undefined;
  include_federal?: boolean | undefined;
};

const LOAN_FIELDS: readonly string[] = [
  "program_type",
  "program_name",
  "eligible_applicants",
  "eligible_projects",
  "funding_amount",
  "deadline_or_intake",
  "status",
];

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function jurisdictionMatches(
  row: ProgramProfile,
  target: string,
  includeFederal: boolean,
): boolean {
  const jurisdiction = normalizeToken(String(row.jurisdiction ?? ""));

  if (jurisdiction === target) {
    return true;
  }

  return includeFederal && jurisdiction === "federal";
}

function coerceText(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).replace(/\s+/g, " ").trim();
}

function looksLoanBackedRow(row: ProgramProfile): boolean {
  const blobs = LOAN_FIELDS.map((key) =>
    coerceText(row[key as keyof ProgramProfile]),
  ).filter(Boolean);

  return textLooksLoanBacked(blobs);
}

function coerceSourceUrls(program: ProgramProfile): string[] {
  const raw = program.source_urls;

  if (!Array.isArray(raw)) {
    return [];
  }

  const urls = raw.filter((u): u is string => typeof u === "string" && u.trim() !== "");

  return [...new Set(urls)];
}

function activeStatusBoost(status: string): number {
  return normalizeToken(status).startsWith("active") ? 10 : 0;
}

/** Filter + rank programs for corpus tool. */
export function filterAndRankPrograms(
  rows: readonly ProgramProfile[],
  params: SearchCorpusParams,
): SearchCorpusResultRow[] {
  const jurisdictionalTarget = normalizeToken(params.jurisdiction ?? "");
  const programTypeWant = normalizeToken(params.program_type ?? "");
  const includeFederalMerged =
    jurisdictionalTarget === "" ? true : Boolean(params.include_federal ?? true);
  const keywordsMerged = sanitizeKeywords(params.keywords ?? []);

  const filtered = rows.filter((row) => {
    if (row.business_only !== true) {
      return false;
    }

    if (looksLoanBackedRow(row)) {
      return false;
    }

    if (
      programTypeWant !== ""
      && normalizeToken(String(row.program_type ?? "")) !== programTypeWant
    ) {
      return false;
    }

    if (
      jurisdictionalTarget !== ""
      && !jurisdictionMatches(row, jurisdictionalTarget, includeFederalMerged)
    ) {
      return false;
    }

    return true;
  });

  const scored = filtered.map((program) => {
    const corpusKeywordScore = corpusKeywordOverlapScore(program, keywordsMerged);
    const urls = coerceSourceUrls(program);

    const rowOut: SearchCorpusResultRow = {
      corpus_keyword_score: corpusKeywordScore,
      program_name: program.program_name,
      jurisdiction: program.jurisdiction,
      program_type: program.program_type,
      eligible_applicants: program.eligible_applicants,
      eligible_projects: program.eligible_projects,
      funding_amount: program.funding_amount,
      deadline_or_intake: program.deadline_or_intake,
      status: program.status,
      confidence: program.confidence,
      source_urls: urls,
    };

    return { rowOut, corpusKeywordScore, program };
  });

  scored.sort((left, right) => {
    if (left.corpusKeywordScore !== right.corpusKeywordScore) {
      return right.corpusKeywordScore - left.corpusKeywordScore;
    }

    const statusDelta =
      activeStatusBoost(String(right.program.status ?? ""))
      - activeStatusBoost(String(left.program.status ?? ""));

    if (statusDelta !== 0) {
      return statusDelta;
    }

    return String(left.program.program_name ?? "").localeCompare(
      String(right.program.program_name ?? ""),
    );
  });

  const limited = scored.slice(0, MAX_CORPUS_RESULTS).map(({ rowOut }) => rowOut);

  return limited;
}
