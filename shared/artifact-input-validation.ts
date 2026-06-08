import type {
	ArtifactEvidence,
	ArtifactEvidenceProgram,
	ArtifactProgramVerdict,
	ArtifactTriggerReason,
	ArtifactValidationError,
	ArtifactValidationResult,
	ArtifactVerification,
	CreateFundingArtifactInput,
	FundingConfidence
} from '@penny/shared/artifact-types';
import { classifyFundingBenefitScope } from '@penny/shared/funding-benefit-scope';
import {
	CONFIDENCE_LABELS,
	MAX_CHANGE_SUMMARY_LENGTH,
	MAX_EVIDENCE_PROGRAMS,
	PROGRAM_VERDICTS,
	TRIGGER_REASONS
} from '#artifact-validation-constants';
import { isOneOf, isRecord, readOptionalString, readString } from '#artifact-validation-utils';

export {
	ARTIFACT_FORMAT_VERSION,
	CONFIDENCE_LABELS,
	MAX_CHANGE_SUMMARY_LENGTH,
	MAX_EVIDENCE_PROGRAMS,
	PROGRAM_VERDICTS,
	TRIGGER_REASONS
} from '#artifact-validation-constants';

const HTTP_URL_PATTERN = /^https?:\/\/.+/i;
const MARKDOWN_TASK_ITEM_PATTERN = /^\s*-\s+\[[ xX]\]\s+/m;
const MARKDOWN_NUMBERED_STEP_PATTERN = /^\s*\d+\.\s+/m;
const PROGRAM_MEMO_SECTION_PATTERN =
	/^##\s+(Strong fits|Conditional fits|Stretch|Programs to pursue|Ruled out)\b/im;
const NUMBERED_PROGRAM_HEADING_PATTERN = /^#{3,4}\s+\d+[.)]?\s+/m;
const H2_HEADING_PATTERN = /^##\s+(.+)$/;
const PROGRAM_HEADING_PATTERN = /^#{3,4}\s+(.+)$/;
const RULED_OUT_SECTION_PATTERN =
	/\b(ruled out|not a fit|excluded|outside scope|what about loans|doesn['\u2019]t fit|does not fit|what doesn['\u2019]t fit|what does not fit)\b/i;
const INTERNAL_TOOL_LEAK_PATTERNS = [
	/blocked_by_anti_bot/i,
	/anti-bot protection/i,
	/verifying your browser before proceeding/i,
	/read tool not found/i,
	/\btoolCall\b/,
	/\btoolResult\b/,
	/\/app\/workspace\//i
] as const;

type MemoSection = 'neutral' | 'ruled_out';

function parseConfidence(
	value: unknown,
	field: string,
	errors: ArtifactValidationError[]
): FundingConfidence | null {
	const confidence = readString(value, field, errors);
	if (!confidence) {
		return null;
	}
	if (isOneOf(CONFIDENCE_LABELS, confidence)) {
		return confidence;
	}
	errors.push({ field, message: 'invalid confidence label' });
	return null;
}

function parseProgramVerdict(
	value: unknown,
	field: string,
	errors: ArtifactValidationError[]
): ArtifactProgramVerdict | null {
	const verdict = readString(value, field, errors);
	if (!verdict) {
		return null;
	}
	if (isOneOf(PROGRAM_VERDICTS, verdict)) {
		return verdict;
	}
	errors.push({ field, message: 'invalid program verdict' });
	return null;
}

function parseEvidenceProgram(
	value: unknown,
	index: number,
	errors: ArtifactValidationError[]
): ArtifactEvidenceProgram | null {
	const fieldPrefix = `evidence.programs[${index}]`;
	if (!isRecord(value)) {
		errors.push({ field: fieldPrefix, message: 'required object' });
		return null;
	}
	const name = readString(value.name, `${fieldPrefix}.name`, errors);
	const officialUrl = readString(value.officialUrl, `${fieldPrefix}.officialUrl`, errors);
	const confidence = parseConfidence(value.confidence, `${fieldPrefix}.confidence`, errors);
	const verdict = parseProgramVerdict(value.verdict, `${fieldPrefix}.verdict`, errors);
	if (officialUrl && !HTTP_URL_PATTERN.test(officialUrl)) {
		errors.push({ field: `${fieldPrefix}.officialUrl`, message: 'must be http or https URL' });
	}
	if (confidence === 'could_not_verify' && verdict !== 'skip') {
		errors.push({
			field: `${fieldPrefix}.confidence`,
			message: 'could_not_verify programs must use skip verdict'
		});
	}
	if (!name || !officialUrl || !confidence || !verdict) {
		return null;
	}
	return { name, officialUrl, confidence, verdict };
}

function parseEvidencePrograms(value: unknown, errors: ArtifactValidationError[]): ArtifactEvidenceProgram[] {
	if (value === undefined || value === null) {
		return [];
	}
	if (!Array.isArray(value)) {
		errors.push({ field: 'evidence.programs', message: 'must be an array when provided' });
		return [];
	}
	if (value.length > MAX_EVIDENCE_PROGRAMS) {
		errors.push({
			field: 'evidence.programs',
			message: `at most ${MAX_EVIDENCE_PROGRAMS} programs allowed`
		});
	}
	return value.flatMap((program, index) => {
		const parsed = parseEvidenceProgram(program, index, errors);
		return parsed ? [parsed] : [];
	});
}

function parseUrls(value: unknown, errors: ArtifactValidationError[]): string[] | null {
	if (!Array.isArray(value)) {
		errors.push({ field: 'verification.urlsChecked', message: 'required string array' });
		return null;
	}
	const urls = value.flatMap((url, index) => {
		if (typeof url === 'string' && HTTP_URL_PATTERN.test(url.trim())) {
			return [url.trim()];
		}
		errors.push({ field: `verification.urlsChecked[${index}]`, message: 'must be http or https URL' });
		return [];
	});
	if (urls.length === 0) {
		errors.push({ field: 'verification.urlsChecked', message: 'at least one URL required' });
		return null;
	}
	return urls;
}

function parseVerification(
	value: unknown,
	errors: ArtifactValidationError[]
): ArtifactVerification | null {
	if (!isRecord(value)) {
		errors.push({ field: 'verification', message: 'required object' });
		return null;
	}
	const verifiedAt = readString(value.verifiedAt, 'verification.verifiedAt', errors);
	const urlsChecked = parseUrls(value.urlsChecked, errors);
	if (!verifiedAt || !urlsChecked) {
		return null;
	}
	return { verifiedAt, urlsChecked, notes: readOptionalString(value.notes) };
}

function parseTriggerReason(value: unknown, errors: ArtifactValidationError[]): ArtifactTriggerReason | null {
	const triggerReason = readString(value, 'triggerReason', errors);
	if (!triggerReason) {
		return null;
	}
	if (isOneOf(TRIGGER_REASONS, triggerReason)) {
		return triggerReason;
	}
	errors.push({ field: 'triggerReason', message: 'must be auto or user_requested' });
	return null;
}

function normalizeEvidence(input: Record<string, unknown>, errors: ArtifactValidationError[]): ArtifactEvidence | undefined {
	const evidenceProgramsValue = isRecord(input.evidence) ? input.evidence.programs : undefined;
	if (isRecord(input.evidence)) {
		const programs = parseEvidencePrograms(evidenceProgramsValue, errors);
		if (programs.length > 0) {
			return { programs };
		}
	}
	if (evidenceProgramsValue === undefined && Array.isArray(input.programs)) {
		const programs = parseEvidencePrograms(input.programs, errors);
		return programs.length > 0 ? { programs } : undefined;
	}
	return undefined;
}

function hasActionableMarkdown(bodyMarkdown: string): boolean {
	return (
		MARKDOWN_TASK_ITEM_PATTERN.test(bodyMarkdown) || MARKDOWN_NUMBERED_STEP_PATTERN.test(bodyMarkdown)
	);
}

function hasProgramMemoMarkdown(bodyMarkdown: string): boolean {
	return (
		PROGRAM_MEMO_SECTION_PATTERN.test(bodyMarkdown) ||
		NUMBERED_PROGRAM_HEADING_PATTERN.test(bodyMarkdown)
	);
}

function hasInternalToolLeakLanguage(bodyMarkdown: string): boolean {
	return INTERNAL_TOOL_LEAK_PATTERNS.some((pattern) => pattern.test(bodyMarkdown));
}

function classifyMemoSection(headingText: string): MemoSection {
	if (RULED_OUT_SECTION_PATTERN.test(headingText)) {
		return 'ruled_out';
	}
	return 'neutral';
}

function lineLooksLoanLike(line: string): boolean {
	return classifyFundingBenefitScope(line).reason === 'loan_like';
}

function hasActionableLoanLikeProgram(bodyMarkdown: string): boolean {
	let section: MemoSection = 'neutral';

	for (const line of bodyMarkdown.split('\n')) {
		const h2Match = H2_HEADING_PATTERN.exec(line);
		if (h2Match) {
			const headingText = h2Match[1];
			section = classifyMemoSection(headingText);
			if (section !== 'ruled_out' && lineLooksLoanLike(headingText)) {
				return true;
			}
			continue;
		}

		const programHeadingMatch = PROGRAM_HEADING_PATTERN.exec(line);
		if (programHeadingMatch) {
			if (section !== 'ruled_out' && lineLooksLoanLike(programHeadingMatch[1])) {
				return true;
			}
			continue;
		}

		if (section === 'ruled_out') {
			continue;
		}
		if (lineLooksLoanLike(line)) {
			return true;
		}
	}

	return false;
}

function parseCreateInput(
	input: Record<string, unknown>,
	errors: ArtifactValidationError[]
): CreateFundingArtifactInput | null {
	const title = readString(input.title, 'title', errors);
	const bodyMarkdown = readString(input.bodyMarkdown, 'bodyMarkdown', errors);
	const triggerReason = parseTriggerReason(input.triggerReason, errors);
	const verification = parseVerification(input.verification, errors);
	const evidence = normalizeEvidence(input, errors);
	if (!title || !bodyMarkdown || !triggerReason || !verification) {
		return null;
	}
	if (!hasActionableMarkdown(bodyMarkdown)) {
		errors.push({
			field: 'bodyMarkdown',
			message: 'include at least one checklist (- [ ]) or numbered step (1. )'
		});
		return null;
	}
	if (hasInternalToolLeakLanguage(bodyMarkdown)) {
		errors.push({
			field: 'bodyMarkdown',
			message: 'internal tool failure text must not appear in the artifact'
		});
		return null;
	}
	if (hasActionableLoanLikeProgram(bodyMarkdown)) {
		errors.push({
			field: 'bodyMarkdown',
			message: 'loan-like products must be ruled out, not listed as actionable programs'
		});
		return null;
	}
	const changeSummary = readOptionalString(input.changeSummary);
	if (changeSummary && changeSummary.length > MAX_CHANGE_SUMMARY_LENGTH) {
		errors.push({
			field: 'changeSummary',
			message: `at most ${MAX_CHANGE_SUMMARY_LENGTH} characters`
		});
		return null;
	}
	if (hasProgramMemoMarkdown(bodyMarkdown) && (evidence?.programs?.length ?? 0) === 0) {
		errors.push({
			field: 'evidence.programs',
			message: 'program recommendations require evidence.programs with verified official URLs and verdicts'
		});
		return null;
	}
	return {
		title,
		bodyMarkdown,
		triggerReason,
		verification,
		evidence,
		changeSummary
	};
}

export function validateCreateFundingArtifactInput(input: unknown): ArtifactValidationResult {
	const errors: ArtifactValidationError[] = [];
	if (!isRecord(input)) {
		return { ok: false, errors: [{ field: 'root', message: 'required object' }] };
	}
	const value = parseCreateInput(input, errors);
	return errors.length > 0 || !value ? { ok: false, errors } : { ok: true, value };
}
