export const MAX_FUNDING_BRIEF_PROGRAMS = 5;

export const CONFIDENCE_LABELS = [
	'verified_live',
	'newly_discovered',
	'could_not_verify'
] as const;

export type FundingConfidence = (typeof CONFIDENCE_LABELS)[number];

export const TRIGGER_REASONS = ['auto', 'user_requested'] as const;

export type FundingBriefTriggerReason = (typeof TRIGGER_REASONS)[number];

const SESSION_UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const HTTP_URL_PATTERN = /^https?:\/\/.+/i;

export type FundingBriefBusiness = {
	name?: string;
	province?: string;
	sector?: string;
	employees?: string;
	projectSummary?: string;
};

export type FundingBriefProgram = {
	name: string;
	whyFit: string;
	whyNot: string;
	benefitType: string;
	intakeStatus: string;
	officialUrl: string;
	confidence: FundingConfidence;
	nextStep: string;
};

export type FundingBriefVerification = {
	verifiedAt: string;
	urlsChecked: string[];
	notes?: string;
};

export type FundingBriefContent = {
	title: string;
	triggerReason: FundingBriefTriggerReason;
	business: FundingBriefBusiness;
	programs: FundingBriefProgram[];
	verification: FundingBriefVerification;
};

export type FundingBriefInput = FundingBriefContent & {
	sessionUuid: string;
};

export type FundingBriefRecord = FundingBriefInput & {
	artifactId: string;
	version: number;
	createdAt: string;
	updatedAt: string;
};

export type FundingBriefValidationError = {
	field: string;
	message: string;
};

export type FundingBriefValidationResult =
	| { ok: true; value: FundingBriefInput }
	| { ok: false; errors: FundingBriefValidationError[] };

export type FundingBriefContentValidationResult =
	| { ok: true; value: FundingBriefContent }
	| { ok: false; errors: FundingBriefValidationError[] };

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
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
	if (!CONFIDENCE_LABELS.includes(confidence as FundingConfidence)) {
		errors.push({ field, message: 'invalid confidence label' });
		return null;
	}
	return confidence as FundingConfidence;
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

	return {
		name,
		whyFit,
		whyNot,
		benefitType,
		intakeStatus,
		officialUrl,
		confidence,
		nextStep
	};
}

function parseVerification(value: unknown, errors: FundingBriefValidationError[]): FundingBriefVerification | null {
	if (!isRecord(value)) {
		errors.push({ field: 'verification', message: 'required object' });
		return null;
	}

	const verifiedAt = readString(value.verifiedAt, 'verification.verifiedAt', errors);
	if (!verifiedAt) {
		return null;
	}

	if (!Array.isArray(value.urlsChecked)) {
		errors.push({ field: 'verification.urlsChecked', message: 'required string array' });
		return null;
	}

	const urlsChecked: string[] = [];
	for (let index = 0; index < value.urlsChecked.length; index += 1) {
		const url = value.urlsChecked[index];
		if (typeof url !== 'string' || !HTTP_URL_PATTERN.test(url.trim())) {
			errors.push({
				field: `verification.urlsChecked[${index}]`,
				message: 'must be http or https URL'
			});
			continue;
		}
		urlsChecked.push(url.trim());
	}

	if (urlsChecked.length === 0) {
		errors.push({ field: 'verification.urlsChecked', message: 'at least one URL required' });
		return null;
	}

	return {
		verifiedAt,
		urlsChecked,
		notes: readOptionalString(value.notes)
	};
}

function parseFundingBriefContent(
	input: Record<string, unknown>,
	errors: FundingBriefValidationError[]
): FundingBriefContent | null {
	const title = readString(input.title, 'title', errors);

	const triggerReasonRaw = readString(input.triggerReason, 'triggerReason', errors);
	let triggerReason: FundingBriefTriggerReason | null = null;
	if (triggerReasonRaw) {
		if (!TRIGGER_REASONS.includes(triggerReasonRaw as FundingBriefTriggerReason)) {
			errors.push({ field: 'triggerReason', message: 'must be auto or user_requested' });
		} else {
			triggerReason = triggerReasonRaw as FundingBriefTriggerReason;
		}
	}

	const business = parseBusiness(input.business, errors);

	if (!Array.isArray(input.programs)) {
		errors.push({ field: 'programs', message: 'required array' });
	} else if (input.programs.length === 0) {
		errors.push({ field: 'programs', message: 'at least one program required' });
	} else if (input.programs.length > MAX_FUNDING_BRIEF_PROGRAMS) {
		errors.push({
			field: 'programs',
			message: `at most ${MAX_FUNDING_BRIEF_PROGRAMS} programs allowed`
		});
	}

	const programs: FundingBriefProgram[] = [];
	if (Array.isArray(input.programs)) {
		for (let index = 0; index < input.programs.length; index += 1) {
			const program = parseProgram(input.programs[index], index, errors);
			if (program) {
				programs.push(program);
			}
		}
	}

	const verification = parseVerification(input.verification, errors);

	if (!title || !triggerReason || !verification) {
		return null;
	}

	return {
		title,
		triggerReason,
		business,
		programs,
		verification
	};
}

export function validateFundingBriefContent(input: unknown): FundingBriefContentValidationResult {
	const errors: FundingBriefValidationError[] = [];
	if (!isRecord(input)) {
		return { ok: false, errors: [{ field: 'root', message: 'required object' }] };
	}

	const content = parseFundingBriefContent(input, errors);
	if (errors.length > 0 || !content) {
		return { ok: false, errors };
	}

	return { ok: true, value: content };
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
	if (errors.length > 0 || !sessionUuid || !content) {
		return { ok: false, errors };
	}

	return {
		ok: true,
		value: {
			sessionUuid,
			...content
		}
	};
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
