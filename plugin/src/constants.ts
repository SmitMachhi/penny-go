/** Milliseconds allowed for Crawl4AI subprocess. */
export const READ_OFFICIAL_SOURCE_TIMEOUT_MS = 120_000;

/** Milliseconds allowed for slide PDF subprocess. */
export const RENDER_SLIDES_PDF_TIMEOUT_MS = 60_000;

/** Resolve `verified-programs.jsonl` relative to repo root when no corpusPath/PENNY_CORPUS_PATH. */
export const CORPUS_SEGMENTS_RELATIVE = [
	'database',
	'data',
	'funding',
	'curated',
	'verified-programs.jsonl'
] as const;
