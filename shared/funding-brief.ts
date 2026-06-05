import type {
	FundingBriefBusiness,
	FundingBriefContent,
	FundingBriefContentValidationResult,
	FundingBriefProgram,
	FundingBriefTriggerReason,
	FundingBriefValidationError,
	FundingBriefValidationResult,
	FundingBriefVerification,
	FundingConfidence,
	ProgramVerdict
} from './funding-brief-types.js';
import {
	classifyFundingBenefitScope,
	containsActionableLoanLikeLanguage
} from './funding-benefit-scope.ts';

export type {
	FundingBriefBusiness,
	FundingBriefContent,
	FundingBriefContentValidationResult,
	FundingBriefInput,
	FundingBriefProgram,
	FundingBriefRecord,
	FundingBriefValidationError,
	FundingBriefValidationResult,
	FundingBriefVerification,
	FundingBriefTriggerReason,
	FundingConfidence,
	ProgramVerdict
} from './funding-brief-types.js';

export const MAX_FUNDING_BRIEF_PROGRAMS = 5;
export const FUNDING_BRIEF_FORMAT_VERSION = 3;

export const CONFIDENCE_LABELS = ['verified_live', 'newly_discovered', 'could_not_verify'] as const satisfies readonly FundingConfidence[];

export const PROGRAM_VERDICT_LABELS = ['pursue_now', 'explore', 'defer', 'skip'] as const satisfies readonly ProgramVerdict[];

export const TRIGGER_REASONS = ['auto', 'user_requested'] as const satisfies readonly FundingBriefTriggerReason[];

const SESSION_UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HTTP_URL_PATTERN = /^https?:\/\/.+/i;
const MARKDOWN_TASK_ITEM_PATTERN = /^\s*-\s+\[[ xX]\]\s+/m;
const MARKDOWN_NUMBERED_STEP_PATTERN = /^\s*\d+\.\s+/m;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOneOf<T extends string>(options: readonly T[], value: string): value is T {
	return options.some((option) => option === value);
}

function readString(value: unknown, field: string, errors: FundingBriefValidationError[]): string | null {
	if (typeof value !== 'string' || value.trim().length === 0) {
		errors.push({ field, message: 'required non-empty string' });
		return null;
	}
	return value.trim();
}

function readOptionalString(value: unknown): string | undefined {
	if (typeof value !== 'string') {
		return undefined;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function readStringArray(
	value: unknown,
	field: string,
	errors: FundingBriefValidationError[]
): string[] | undefined {
	if (value === undefined || value === null) {
		return undefined;
	}
	if (!Array.isArray(value)) {
		errors.push({ field, message: 'must be a string array when provided' });
		return undefined;
	}
	const items = value.flatMap((entry, index) => {
		if (typeof entry === 'string' && entry.trim().length > 0) {
			return [entry.trim()];
		}
		errors.push({ field: `${field}[${index}]`, message: 'required non-empty string' });
		return [];
	});
	return items.length > 0 ? items : undefined;
}

function parseBusiness(value: unknown, errors: FundingBriefValidationError[]): FundingBriefBusiness | undefined {
	if (value === undefined || value === null) {
		return undefined;
	}
	if (!isRecord(value)) {
		errors.push({ field: 'business', message: 'must be an object when provided' });
		return undefined;
	}
	return {
		name: readOptionalString(value.name),
		province: readOptionalString(value.province),
		sector: readOptionalString(value.sector),
		employees: readOptionalString(value.employees),
		projectSummary: readOptionalString(value.projectSummary)
	};
}

function parseConfidence(value: unknown, field: string, errors: FundingBriefValidationError[]): FundingConfidence | null {
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

function parseVerdict(value: unknown, field: string, errors: FundingBriefValidationError[]): ProgramVerdict | undefined {
	if (value === undefined || value === null) {
		return undefined;
	}
	if (typeof value !== 'string') {
		errors.push({ field, message: 'must be a string when provided' });
		return undefined;
	}
	const trimmed = value.trim();
	if (isOneOf(PROGRAM_VERDICT_LABELS, trimmed)) {
		return trimmed;
	}
	errors.push({ field, message: 'invalid verdict label' });
	return undefined;
}

function programHasActionPath(program: FundingBriefProgram): boolean {
	return Boolean(program.nextStep?.trim() || (program.steps && program.steps.length > 0));
}

function programScopeText(program: FundingBriefProgram): string {
	return [
		program.name,
		program.benefitType,
		program.plainTerms,
		program.whyFit,
		program.nextStep,
		...(program.steps ?? [])
	]
		.filter((value): value is string => typeof value === 'string')
		.join('\n');
}

function validateProgramBenefitScope(
	program: FundingBriefProgram,
	fieldPrefix: string,
	errors: FundingBriefValidationError[]
): void {
	const scope = classifyFundingBenefitScope(programScopeText(program));
	if (scope.allowed || program.verdict === 'skip') {
		return;
	}
	errors.push({
		field: `${fieldPrefix}.benefitType`,
		message:
			scope.reason === 'loan_like'
				? `loan-like benefits must use verdict skip and appear only under ruled out (${scope.match})`
				: 'benefit type must clearly be non-loan for actionable programs'
	});
}

function parseProgram(value: unknown, index: number, errors: FundingBriefValidationError[]): FundingBriefProgram | null {
	const fieldPrefix = `programs[${index}]`;
	if (!isRecord(value)) {
		errors.push({ field: fieldPrefix, message: 'required object' });
		return null;
	}
	const name = readString(value.name, `${fieldPrefix}.name`, errors);
	const benefitType = readString(value.benefitType, `${fieldPrefix}.benefitType`, errors);
	const intakeStatus = readString(value.intakeStatus, `${fieldPrefix}.intakeStatus`, errors);
	const officialUrl = readString(value.officialUrl, `${fieldPrefix}.officialUrl`, errors);
	const confidence = parseConfidence(value.confidence, `${fieldPrefix}.confidence`, errors);
	const nextStep = readOptionalString(value.nextStep);
	const steps = readStringArray(value.steps, `${fieldPrefix}.steps`, errors);
	const prerequisites = readStringArray(value.prerequisites, `${fieldPrefix}.prerequisites`, errors);
	const documents = readStringArray(value.documents, `${fieldPrefix}.documents`, errors);
	const verdict = parseVerdict(value.verdict, `${fieldPrefix}.verdict`, errors);
	if (officialUrl && !HTTP_URL_PATTERN.test(officialUrl)) {
		errors.push({ field: `${fieldPrefix}.officialUrl`, message: 'must be http or https URL' });
	}
	if (!name || !benefitType || !intakeStatus || !officialUrl || !confidence) {
		return null;
	}
	const program: FundingBriefProgram = {
		name,
		benefitType,
		intakeStatus,
		officialUrl,
		confidence,
		verdict,
		plainTerms: readOptionalString(value.plainTerms),
		whyFit: readOptionalString(value.whyFit),
		whyNot: readOptionalString(value.whyNot),
		prerequisites,
		steps,
		documents,
		timeline: readOptionalString(value.timeline),
		fallback: readOptionalString(value.fallback),
		nextStep
	};
	if (!programHasActionPath(program)) {
		errors.push({
			field: `${fieldPrefix}.nextStep`,
			message: 'provide nextStep and/or a non-empty steps array'
		});
		return null;
	}
	validateProgramBenefitScope(program, fieldPrefix, errors);
	return program;
}

function parseUrls(value: unknown, errors: FundingBriefValidationError[]): string[] | null {
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

function parseVerification(value: unknown, errors: FundingBriefValidationError[]): FundingBriefVerification | null {
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

function parseTriggerReason(value: unknown, errors: FundingBriefValidationError[]): FundingBriefTriggerReason | null {
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

function parsePrograms(input: Record<string, unknown>, errors: FundingBriefValidationError[]): FundingBriefProgram[] {
	if (!Array.isArray(input.programs)) {
		errors.push({ field: 'programs', message: 'required array' });
		return [];
	}
	if (input.programs.length === 0) {
		errors.push({ field: 'programs', message: 'at least one program required' });
	}
	if (input.programs.length > MAX_FUNDING_BRIEF_PROGRAMS) {
		errors.push({ field: 'programs', message: `at most ${MAX_FUNDING_BRIEF_PROGRAMS} programs allowed` });
	}
	return input.programs.flatMap((program, index) => {
		const parsed = parseProgram(program, index, errors);
		return parsed ? [parsed] : [];
	});
}

function hasActionableDocumentContent(content: FundingBriefContent): boolean {
	if (MARKDOWN_TASK_ITEM_PATTERN.test(content.bodyMarkdown)) {
		return true;
	}
	if (MARKDOWN_NUMBERED_STEP_PATTERN.test(content.bodyMarkdown)) {
		return true;
	}
	return content.programs.some((program) => program.steps && program.steps.length > 0);
}

function parseFundingBriefContent(
	input: Record<string, unknown>,
	errors: FundingBriefValidationError[]
): FundingBriefContent | null {
	const title = readString(input.title, 'title', errors);
	const bodyMarkdown = readString(input.bodyMarkdown, 'bodyMarkdown', errors);
	const triggerReason = parseTriggerReason(input.triggerReason, errors);
	const business = parseBusiness(input.business, errors);
	const programs = parsePrograms(input, errors);
	const verification = parseVerification(input.verification, errors);
	if (!title || !bodyMarkdown || !triggerReason || !verification) {
		return null;
	}
	const content = { title, bodyMarkdown, triggerReason, business, programs, verification };
	if (containsActionableLoanLikeLanguage(content.bodyMarkdown)) {
		errors.push({
			field: 'bodyMarkdown',
			message: 'loan-like benefits must appear only in ruled-out sections'
		});
		return null;
	}
	if (!hasActionableDocumentContent(content)) {
		errors.push({
			field: 'bodyMarkdown',
			message: 'include at least one checklist (- [ ]), numbered step, or program steps[]'
		});
		return null;
	}
	return content;
}

export function validateFundingBriefContent(input: unknown): FundingBriefContentValidationResult {
	const errors: FundingBriefValidationError[] = [];
	if (!isRecord(input)) {
		return { ok: false, errors: [{ field: 'root', message: 'required object' }] };
	}
	const content = parseFundingBriefContent(input, errors);
	return errors.length > 0 || !content ? { ok: false, errors } : { ok: true, value: content };
}

export function validateFundingBriefInput(input: unknown): FundingBriefValidationResult {
	const errors: FundingBriefValidationError[] = [];
	if (!isRecord(input)) {
		return { ok: false, errors: [{ field: 'root', message: 'required object' }] };
	}
	const sessionUuid = readString(input.sessionUuid, 'sessionUuid', errors);
	if (sessionUuid && !SESSION_UUID_PATTERN.test(sessionUuid)) {
		errors.push({ field: 'sessionUuid', message: 'must be UUID v4' });
	}
	const content = parseFundingBriefContent(input, errors);
	return errors.length > 0 || !sessionUuid || !content
		? { ok: false, errors }
		: { ok: true, value: { sessionUuid, ...content } };
}

export function confidenceDisplayLabel(confidence: FundingConfidence): string {
	switch (confidence) {
		case 'verified_live':
			return 'Verified live';
		case 'newly_discovered':
			return 'Newly discovered';
		case 'could_not_verify':
			return 'Could not verify';
	}
}
