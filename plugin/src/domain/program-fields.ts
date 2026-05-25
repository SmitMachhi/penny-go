import type { ProgramProfile } from "../corpus-types.js";
import { coerceSearchText } from "../services/text-normalize.js";

export const PROGRAM_LOAN_AUDIT_FIELDS = [
  "program_type",
  "program_name",
  "eligible_applicants",
  "eligible_projects",
  "funding_amount",
  "deadline_or_intake",
  "status",
] as const satisfies readonly (keyof ProgramProfile)[];

export const PROGRAM_KEYWORD_HAYSTACK_FIELDS = [
  "program_name",
  "program_type",
  "eligible_applicants",
  "eligible_projects",
  "funding_amount",
  "deadline_or_intake",
  "status",
  "provider",
] as const satisfies readonly (keyof ProgramProfile)[];

export function collectProgramTextFields(
  row: ProgramProfile,
  fields: readonly (keyof ProgramProfile)[],
): string[] {
  return fields
    .map((key) => coerceSearchText(row[key]))
    .filter(Boolean);
}
