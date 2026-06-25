/** Milliseconds allowed for Crawl4AI subprocess. */
export const READ_OFFICIAL_SOURCE_TIMEOUT_MS = 120_000;

/** Milliseconds allowed for non-PDF Crawl4AI pages before Firecrawl fallback. */
export const READ_OFFICIAL_SOURCE_HTML_TIMEOUT_MS = 15_000;

/** Maximum Firecrawl markdown characters returned for one official URL. */
export const FIRECRAWL_SCRAPE_MAX_CHARACTERS = 20_000;

/** Milliseconds allowed for Firecrawl scrape fallback. */
export const FIRECRAWL_SCRAPE_TIMEOUT_MS = 15_000;

/** Firecrawl scrape attempts after Crawl4AI fails the clean-content check. */
export const FIRECRAWL_SCRAPE_RETRY_ATTEMPTS = 3;

/** Pause between Firecrawl retry attempts. */
export const FIRECRAWL_SCRAPE_RETRY_DELAY_MS = 500;

/** Milliseconds to cache successful official source reads in-process. */
export const OFFICIAL_SOURCE_SUCCESS_CACHE_TTL_MS = 10 * 60 * 1000;

/** Below this length, a lone CAPTCHA mention may still indicate a challenge page. */
export const OFFICIAL_SOURCE_SUBSTANTIVE_PAGE_MIN_CHARS = 2_000;

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
