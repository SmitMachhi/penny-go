import { findActionableLoanLikeEvidence } from '@penny/shared/funding-benefit-scope';

export type OfficialBenefitScope = {
	scope_verdict: 'ruled_out' | 'unknown';
	scope_reason: string;
	instruction: string;
	matched_text?: string;
	matched_term?: string;
	matched_region?: 'program_body';
};

const RULED_OUT_REASON = 'loan_like_or_repayable_language_detected';
const UNKNOWN_REASON = 'no_loan_like_language_detected';
const RULED_OUT_INSTRUCTION =
	'Do not name this program as actionable for Penny non-loan scope; mention only under ruled out if useful.';
const UNKNOWN_INSTRUCTION =
	'No loan-like language was detected by the heuristic; still verify repayment status from the page before recommending.';

export function officialBenefitScopeFromMarkdown(markdown: string): OfficialBenefitScope {
	const evidence = findActionableLoanLikeEvidence(markdown);
	if (evidence) {
		return {
			scope_verdict: 'ruled_out',
			scope_reason: RULED_OUT_REASON,
			instruction: RULED_OUT_INSTRUCTION,
			matched_text: evidence.text,
			matched_term: evidence.match,
			matched_region: 'program_body'
		};
	}
	return {
		scope_verdict: 'unknown',
		scope_reason: UNKNOWN_REASON,
		instruction: UNKNOWN_INSTRUCTION
	};
}

export function appendOfficialBenefitScope(payload: unknown): unknown {
	if (!isRecord(payload) || payload.success !== true) {
		return payload;
	}
	const markdown = payload.markdown;
	if (typeof markdown !== 'string') {
		return payload;
	}
	return {
		...payload,
		benefit_scope: officialBenefitScopeFromMarkdown(markdown)
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
