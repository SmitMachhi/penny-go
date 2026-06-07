/** Milliseconds allowed for Crawl4AI subprocess. */
export const READ_OFFICIAL_SOURCE_TIMEOUT_MS = 120_000;

/** Milliseconds allowed for non-PDF Crawl4AI pages before using the Exa fallback. */
export const READ_OFFICIAL_SOURCE_HTML_TIMEOUT_MS = 30_000;

/** Maximum Exa markdown characters returned for one official URL. */
export const EXA_CONTENTS_MAX_CHARACTERS = 20_000;

/** Milliseconds allowed for Exa known-URL content fallback. */
export const EXA_CONTENTS_TIMEOUT_MS = 15_000;

/** Milliseconds to cache successful official source reads in-process. */
export const OFFICIAL_SOURCE_SUCCESS_CACHE_TTL_MS = 10 * 60 * 1000;

/** Milliseconds to cache blocked official source reads in-process. */
export const OFFICIAL_SOURCE_BLOCKED_CACHE_TTL_MS = 60 * 1000;

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
