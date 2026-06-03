import type {
	ArtifactEvidence,
	ArtifactEvidenceProgram,
	ArtifactTriggerReason,
	ArtifactValidationError,
	ArtifactValidationResult,
	CreateFundingArtifactInput,
	FundingConfidence
} from './artifact-types.ts';

export const MAX_EVIDENCE_PROGRAMS = 5;
export const ARTIFACT_FORMAT_VERSION = 4;

export const CONFIDENCE_LABELS = [
	'verified_live',
	'newly_discovered',
	'could_not_verify'
] as const satisfies readonly FundingConfidence[];

export const TRIGGER_REASONS = ['auto', 'user_requested'] as const satisfies readonly ArtifactTriggerReason[];

const HTTP_URL_PATTERN = /^https?:\/\/.+/i;
const MARKDOWN_TASK_ITEM_PATTERN = /^\s*-\s+\[[ xX]\]\s+/m;
const MARKDOWN_NUMBERED_STEP_PATTERN = /^\s*\d+\.\s+/m;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOneOf<T extends string>(options: readonly T[], value: string): value is T {
	return options.some((option) => option === value);
}

function readString(value: unknown, field: string, errors: ArtifactValidationError[]): string | null {
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

function parseConfidence(value: unknown, field: string, errors: ArtifactValidationError[]): FundingConfidence | null {
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
	if (officialUrl && !HTTP_URL_PATTERN.test(officialUrl)) {
		errors.push({ field: `${fieldPrefix}.officialUrl`, message: 'must be http or https URL' });
	}
	if (!name || !officialUrl || !confidence) {
		return null;
	}
	return { name, officialUrl, confidence };
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

function parseVerification(value: unknown, errors: ArtifactValidationError[]) {
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
	if (isRecord(input.evidence)) {
		const programs = parseEvidencePrograms(input.evidence.programs, errors);
		return programs.length > 0 ? { programs } : undefined;
	}
	if (Array.isArray(input.programs)) {
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
	return { title, bodyMarkdown, triggerReason, verification, evidence };
}

export function validateCreateFundingArtifactInput(input: unknown): ArtifactValidationResult {
	const errors: ArtifactValidationError[] = [];
	if (!isRecord(input)) {
		return { ok: false, errors: [{ field: 'root', message: 'required object' }] };
	}
	const value = parseCreateInput(input, errors);
	return errors.length > 0 || !value ? { ok: false, errors } : { ok: true, value };
}
