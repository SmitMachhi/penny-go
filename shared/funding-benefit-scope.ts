export type FundingBenefitScopeReason = 'non_loan' | 'loan_like' | 'unknown';

export type FundingBenefitScope = {
	allowed: boolean;
	reason: FundingBenefitScopeReason;
	match?: string;
};

const LOAN_LIKE_PATTERN =
	/\b(?:loan|loan[- ]guarantee|loan[- ]insurance|low[- ]cost financing|low interest|repayable contribution|repayable royalty|repayable financing|forgivable loan|loan interest)\b/i;
const NON_LOAN_PATTERN =
	/\b(?:non[- ]repayable|grant|rebate|tax credit|wage subsidy|subsidy|voucher|contribution funding|cost[- ]share)\b/i;
const NEGATED_LOAN_PATTERN =
	/\b(?:not|no|without|exclude|excluded|ruled out|skip|not eligible for)\s+(?:a\s+)?(?:loan|loans|repayable contribution|repayable contributions)\b/i;
const MARKDOWN_HEADING_PATTERN = /^\s*(#{1,6})\s+(.+?)\s*$/;
const RULED_OUT_HEADING_PATTERN =
	/\b(?:ruled out|not a fit|outside scope|what to skip|closed or out|programs ruled out)\b/i;

export function classifyFundingBenefitScope(text: string): FundingBenefitScope {
	const normalized = text.trim();
	if (!normalized) {
		return { allowed: false, reason: 'unknown' };
	}

	const loanLike = LOAN_LIKE_PATTERN.exec(normalized);
	if (loanLike && !NEGATED_LOAN_PATTERN.test(normalized)) {
		return { allowed: false, reason: 'loan_like', match: loanLike[0] };
	}

	if (NON_LOAN_PATTERN.test(normalized) || NEGATED_LOAN_PATTERN.test(normalized)) {
		return { allowed: true, reason: 'non_loan' };
	}

	return { allowed: false, reason: 'unknown' };
}

export function containsActionableLoanLikeLanguage(markdown: string): boolean {
	const actionableMarkdown = stripRuledOutMarkdownSections(markdown);
	const loanLike = LOAN_LIKE_PATTERN.exec(actionableMarkdown);
	if (!loanLike) {
		return false;
	}
	return !NEGATED_LOAN_PATTERN.test(actionableMarkdown);
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
