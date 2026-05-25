export { validateFundingBriefInput } from '@penny/shared/funding-brief';
export type {
	FundingBriefInput,
	FundingBriefProgram,
	FundingBriefRecord
} from '@penny/shared/funding-brief';

import type { FundingBriefInput } from '@penny/shared/funding-brief';

export function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

export function formatBusinessSnapshot(
	business: FundingBriefInput['business']
): string[] {
	const lines: string[] = [];
	if (business.name) {
		lines.push(`Business: ${business.name}`);
	}
	if (business.province) {
		lines.push(`Province: ${business.province}`);
	}
	if (business.sector) {
		lines.push(`Sector: ${business.sector}`);
	}
	if (business.employees) {
		lines.push(`Employees: ${business.employees}`);
	}
	if (business.projectSummary) {
		lines.push(`Project: ${business.projectSummary}`);
	}
	return lines;
}
