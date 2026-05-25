import type { ProgramProfile } from './corpus-types.js';
import { coerceSearchText } from './text-normalize.js';

export { PROGRAM_LOAN_AUDIT_FIELDS } from './loan-filter.js';

export const PROGRAM_KEYWORD_HAYSTACK_FIELDS = [
	'program_name',
	'program_type',
	'eligible_applicants',
	'eligible_projects',
	'funding_amount',
	'deadline_or_intake',
	'status',
	'provider'
] as const satisfies readonly (keyof ProgramProfile)[];

export function collectProgramTextFields(
	row: ProgramProfile,
	fields: readonly (keyof ProgramProfile)[]
): string[] {
	return fields.map((key) => coerceSearchText(row[key])).filter(Boolean);
}
