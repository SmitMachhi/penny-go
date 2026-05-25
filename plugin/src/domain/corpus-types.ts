/** Row shape aligned with corpus JSONL verified programs. */

export type ProgramProfile = {
  business_only?: boolean;
  program_name?: string;
  jurisdiction?: string;
  provider?: string;
  program_type?: string;
  eligible_applicants?: string;
  eligible_projects?: string;
  funding_amount?: string;
  deadline_or_intake?: string;
  status?: string;
  source_urls?: unknown;
  confidence?: string;
};

export type SearchCorpusResultRow = Pick<
  ProgramProfile,
  | "program_name"
  | "jurisdiction"
  | "program_type"
  | "eligible_applicants"
  | "eligible_projects"
  | "funding_amount"
  | "deadline_or_intake"
  | "status"
  | "confidence"
> & {
  source_urls: string[];
  corpus_keyword_score: number;
};
