import heuristic from '@penny/shared/loan-heuristic.json' with { type: 'json' };

import type { ProgramProfile } from './corpus-types.js';

/** Canonical loan-like heuristic — keep in sync via shared/loan-heuristic.json */
const LOANLIKE_REGEX = new RegExp(heuristic.regex, 'iu');

export const PROGRAM_LOAN_AUDIT_FIELDS = heuristic.auditFields as readonly (keyof import('./corpus-types.js').ProgramProfile)[];

export const LOAN_INCLUDE_EVIDENCE = heuristic.includeEvidence;

export function textLooksLoanBacked(textParts: readonly string[]): boolean {
	const blob = textParts.filter(Boolean).join(' ');
	return LOANLIKE_REGEX.test(blob);
}

export function loanAuditTextFromFields(
	row: ProgramProfile,
	fields: readonly (keyof ProgramProfile)[],
	includeEvidence: boolean
): string {
	const fieldText = fields.map((field) => String(row[field] ?? ''));
	if (includeEvidence) {
		const evidence = row.evidence;
		if (Array.isArray(evidence)) {
			fieldText.push(...evidence.map((item) => String(item)));
		}
	}
	return fieldText.join(' ').toLowerCase();
}
