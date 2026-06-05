export type FundingBenefitScopeReason = 'non_loan' | 'loan_like' | 'unknown';

export type FundingBenefitScope = {
	allowed: boolean;
	reason: FundingBenefitScopeReason;
	match?: string;
};

const LOAN_LIKE_PATTERN =
	/\b(?:loan|loan[- ]guarantee|loan[- ]insurance|unsecured financing|low[- ]cost financing|low[- ]cost startup loan|low interest|repayable contribution|repayable contributions|repayable royalty|repayable financing|forgivable loan|loan interest)\b/i;
const REPAYABLE_LIKE_PATTERN =
	/\b(?:repayable contribution|repayable contributions|repayable royalty|repayable financing|forgivable loan)\b/i;
const NON_LOAN_PATTERN =
	/\b(?:non[- ]repayable|grant|rebate|tax credit|wage subsidy|subsidy|voucher|contribution funding|cost[- ]share)\b/i;
const NEGATED_LOAN_PATTERN =
	/\b(?:not|no|without|exclude|excluded|ruled out|skip|not eligible for)\s+(?:a\s+)?(?:loan|loans|repayable contribution|repayable contributions)(?:\s+or\s+repayable contributions)?\b/i;
const REJECTED_LOAN_CONTEXT_PATTERN =
	/\b(?:excluded by scope|outside scope|ruled out|skip|you said no loans|which you said no to|you said no to|not what you asked for|not eligible|not a fit|doesn['\u2019]t fit|does not fit|what doesn['\u2019]t fit|what does not fit)\b/i;
const MARKDOWN_HEADING_PATTERN = /^\s*(#{1,6})\s+(.+?)\s*$/;
const RULED_OUT_HEADING_PATTERN =
	/\b(?:ruled out|not a fit|outside scope|what to skip|closed or out|programs ruled out|what about loans|doesn['\u2019]t fit|does not fit|what doesn['\u2019]t fit|what does not fit)\b/i;
const NON_LOAN_SCOPE_PATTERN = /\bnon[- ]loan\b/gi;
const NON_REPAYABLE_SCOPE_PATTERN = /\bnon[- ]repayable\b/gi;

export function classifyFundingBenefitScope(text: string): FundingBenefitScope {
	const normalized = text.trim();
	if (!normalized) {
		return { allowed: false, reason: 'unknown' };
	}

	const loanLike = actionableLoanLikeMatch(normalized);
	if (loanLike) {
		return { allowed: false, reason: 'loan_like', match: loanLike[0] };
	}

	if (
		NON_LOAN_PATTERN.test(normalized) ||
		NEGATED_LOAN_PATTERN.test(normalized) ||
		REJECTED_LOAN_CONTEXT_PATTERN.test(normalized)
	) {
		return { allowed: true, reason: 'non_loan' };
	}

	return { allowed: false, reason: 'unknown' };
}

export function containsActionableLoanLikeLanguage(markdown: string): boolean {
	const actionableMarkdown = stripRuledOutMarkdownSections(markdown);
	return actionableMarkdown.split('\n').some((line) => actionableLoanLikeMatch(line) !== null);
}

export function stripRuledOutMarkdownSections(markdown: string): string {
	const keptLines: string[] = [];
	let ruledOutLevel: number | null = null;

	for (const line of markdown.split('\n')) {
		const heading = MARKDOWN_HEADING_PATTERN.exec(line);
		if (heading) {
			const level = heading[1].length;
			const isRuledOut = RULED_OUT_HEADING_PATTERN.test(heading[2]);
			if (ruledOutLevel === null && isRuledOut) {
				ruledOutLevel = level;
			} else if (ruledOutLevel !== null && level <= ruledOutLevel) {
				ruledOutLevel = isRuledOut ? level : null;
			}
		}

		if (ruledOutLevel === null) {
			keptLines.push(line);
		}
	}

	return keptLines.join('\n');
}

function actionableLoanLikeMatch(text: string): RegExpExecArray | null {
	const normalized = normalizeLoanScopeText(text);
	const loanLike = LOAN_LIKE_PATTERN.exec(normalized);
	if (!loanLike) {
		return null;
	}
	if (REJECTED_LOAN_CONTEXT_PATTERN.test(normalized)) {
		return null;
	}

	const negatedLoan = NEGATED_LOAN_PATTERN.exec(normalized);
	if (negatedLoan && negatedLoan.index <= loanLike.index) {
		return null;
	}
	if (negatedLoan && !REPAYABLE_LIKE_PATTERN.test(normalized)) {
		return null;
	}

	return loanLike;
}

function normalizeLoanScopeText(text: string): string {
	return text
		.replace(NON_LOAN_SCOPE_PATTERN, 'nonloan')
		.replace(NON_REPAYABLE_SCOPE_PATTERN, 'nonrepayable');
}
