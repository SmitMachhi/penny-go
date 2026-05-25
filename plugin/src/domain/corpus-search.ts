import { MAX_CORPUS_RESULTS } from '../constants.js';
import { corpusKeywordOverlapScore, sanitizeKeywords } from './corpus-keywords.js';
import type { ProgramProfile, SearchCorpusResultRow } from './corpus-types.js';
import {
	PROGRAM_LOAN_AUDIT_FIELDS
} from './program-fields.js';
import { loanAuditTextFromFields, textLooksLoanBacked } from './loan-filter.js';
import { normalizeToken } from './text-normalize.js';

export type SearchCorpusParams = {
	jurisdiction?: string | undefined;
	keywords?: readonly string[] | undefined;
	program_type?: string | undefined;
	include_federal?: boolean | undefined;
};

function jurisdictionMatches(
	row: ProgramProfile,
	target: string,
	includeFederal: boolean
): boolean {
	const jurisdiction = normalizeToken(String(row.jurisdiction ?? ''));

	if (jurisdiction === target) {
		return true;
	}

	return includeFederal && jurisdiction === 'federal';
}

function looksLoanBackedRow(row: ProgramProfile): boolean {
	const auditText = loanAuditTextFromFields(
		row as Record<string, unknown>,
		[...PROGRAM_LOAN_AUDIT_FIELDS],
		true
	);
	return textLooksLoanBacked([auditText]);
}

function coerceSourceUrls(program: ProgramProfile): string[] {
	const raw = program.source_urls;

	if (!Array.isArray(raw)) {
		return [];
	}

	const urls = raw.filter((u): u is string => typeof u === 'string' && u.trim() !== '');

	return [...new Set(urls)];
}

function activeStatusBoost(status: string): number {
	return normalizeToken(status).startsWith('active') ? 10 : 0;
}

export function filterEligiblePrograms(
	rows: readonly ProgramProfile[],
	params: SearchCorpusParams
): ProgramProfile[] {
	const jurisdictionalTarget = normalizeToken(params.jurisdiction ?? '');
	const programTypeWant = normalizeToken(params.program_type ?? '');
	const includeFederalMerged =
		jurisdictionalTarget === '' ? true : Boolean(params.include_federal ?? true);

	return rows.filter((row) => {
		if (row.business_only !== true) {
			return false;
		}

		if (looksLoanBackedRow(row)) {
			return false;
		}

		if (
			programTypeWant !== '' &&
			normalizeToken(String(row.program_type ?? '')) !== programTypeWant
		) {
			return false;
		}

		if (
			jurisdictionalTarget !== '' &&
			!jurisdictionMatches(row, jurisdictionalTarget, includeFederalMerged)
		) {
			return false;
		}

		return true;
	});
}

export function rankFilteredPrograms(
	rows: readonly ProgramProfile[],
	keywords: readonly string[]
): SearchCorpusResultRow[] {
	const keywordsMerged = sanitizeKeywords(keywords);

	const scored = rows.map((program) => {
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
			source_urls: urls
		};

		return { rowOut, corpusKeywordScore, program };
	});

	scored.sort((left, right) => {
		if (left.corpusKeywordScore !== right.corpusKeywordScore) {
			return right.corpusKeywordScore - left.corpusKeywordScore;
		}

		const statusDelta =
			activeStatusBoost(String(right.program.status ?? '')) -
			activeStatusBoost(String(left.program.status ?? ''));

		if (statusDelta !== 0) {
			return statusDelta;
		}

		return String(left.program.program_name ?? '').localeCompare(
			String(right.program.program_name ?? '')
		);
	});

	return scored.map(({ rowOut }) => rowOut);
}

export function filterAndRankPrograms(
	rows: readonly ProgramProfile[],
	params: SearchCorpusParams
): SearchCorpusResultRow[] {
	const filtered = filterEligiblePrograms(rows, params);
	const ranked = rankFilteredPrograms(filtered, params.keywords ?? []);
	return ranked.slice(0, MAX_CORPUS_RESULTS);
}
