import type { FundingBriefBusiness, FundingBriefContent, FundingBriefContentValidationResult, FundingBriefProgram, FundingBriefValidationError, FundingBriefValidationResult, FundingBriefVerification } from './funding-brief-types.js';

export type { FundingBriefBusiness, FundingBriefContent, FundingBriefContentValidationResult, FundingBriefInput, FundingBriefProgram, FundingBriefRecord, FundingBriefValidationError, FundingBriefValidationResult, FundingBriefVerification } from './funding-brief-types.js';

export const MAX_FUNDING_BRIEF_PROGRAMS = 5;

export const CONFIDENCE_LABELS = ['verified_live', 'newly_discovered', 'could_not_verify'] as const;

export type FundingConfidence = (typeof CONFIDENCE_LABELS)[number];

export const TRIGGER_REASONS = ['auto', 'user_requested'] as const;

export type FundingBriefTriggerReason = (typeof TRIGGER_REASONS)[number];
const SESSION_UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HTTP_URL_PATTERN = /^https?:\/\/.+/i;

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

function parseBusiness(value: unknown, errors: FundingBriefValidationError[]): FundingBriefBusiness {
	if (!isRecord(value)) {
		errors.push({ field: 'business', message: 'required object' });
		return {};
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

function parseProgram(value: unknown, index: number, errors: FundingBriefValidationError[]): FundingBriefProgram | null {
	const fieldPrefix = `programs[${index}]`;
	if (!isRecord(value)) {
		errors.push({ field: fieldPrefix, message: 'required object' });
		return null;
	}
	const name = readString(value.name, `${fieldPrefix}.name`, errors);
	const whyFit = readString(value.whyFit, `${fieldPrefix}.whyFit`, errors);
	const whyNot = readString(value.whyNot, `${fieldPrefix}.whyNot`, errors);
	const benefitType = readString(value.benefitType, `${fieldPrefix}.benefitType`, errors);
	const intakeStatus = readString(value.intakeStatus, `${fieldPrefix}.intakeStatus`, errors);
	const officialUrl = readString(value.officialUrl, `${fieldPrefix}.officialUrl`, errors);
	const nextStep = readString(value.nextStep, `${fieldPrefix}.nextStep`, errors);
	const confidence = parseConfidence(value.confidence, `${fieldPrefix}.confidence`, errors);
	if (officialUrl && !HTTP_URL_PATTERN.test(officialUrl)) {
		errors.push({ field: `${fieldPrefix}.officialUrl`, message: 'must be http or https URL' });
	}
	if (!name || !whyFit || !whyNot || !benefitType || !intakeStatus || !officialUrl || !nextStep || !confidence) {
		return null;
	}
	return { name, whyFit, whyNot, benefitType, intakeStatus, officialUrl, confidence, nextStep };
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

function parseFundingBriefContent(
	input: Record<string, unknown>,
	errors: FundingBriefValidationError[]
): FundingBriefContent | null {
	const title = readString(input.title, 'title', errors);
	const triggerReason = parseTriggerReason(input.triggerReason, errors);
	const business = parseBusiness(input.business, errors);
	const programs = parsePrograms(input, errors);
	const verification = parseVerification(input.verification, errors);
	if (!title || !triggerReason || !verification) {
		return null;
	}
	return { title, triggerReason, business, programs, verification };
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
