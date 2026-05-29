import type { FundingBriefTriggerReason, FundingConfidence } from './funding-brief.js';

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

export type FundingBriefInput = FundingBriefContent & { sessionUuid: string };

export type FundingBriefRecord = FundingBriefInput & {
	artifactId: string;
	version: number;
	createdAt: string;
	updatedAt: string;
};

export type FundingBriefValidationError = { field: string; message: string };

export type FundingBriefValidationResult =
	| { ok: true; value: FundingBriefInput }
	| { ok: false; errors: FundingBriefValidationError[] };

export type FundingBriefContentValidationResult =
	| { ok: true; value: FundingBriefContent }
	| { ok: false; errors: FundingBriefValidationError[] };
