export type FundingConfidence = 'verified_live' | 'newly_discovered' | 'could_not_verify';

export type FundingBriefTriggerReason = 'auto' | 'user_requested';

export type ProgramVerdict = 'pursue_now' | 'explore' | 'defer' | 'skip';

export type FundingBriefBusiness = {
	name?: string;
	province?: string;
	sector?: string;
	employees?: string;
	projectSummary?: string;
};

export type FundingBriefProgram = {
	name: string;
	benefitType: string;
	intakeStatus: string;
	officialUrl: string;
	confidence: FundingConfidence;
	verdict?: ProgramVerdict;
	plainTerms?: string;
	whyFit?: string;
	whyNot?: string;
	prerequisites?: string[];
	steps?: string[];
	documents?: string[];
	timeline?: string;
	fallback?: string;
	nextStep?: string;
};

export type FundingBriefVerification = {
	verifiedAt: string;
	urlsChecked: string[];
	notes?: string;
};

export type FundingBriefContent = {
	title: string;
	triggerReason: FundingBriefTriggerReason;
	bodyMarkdown: string;
	business?: FundingBriefBusiness;
	programs: FundingBriefProgram[];
	verification: FundingBriefVerification;
};

export type FundingBriefInput = FundingBriefContent & { sessionUuid: string };

export type FundingBriefRecord = FundingBriefInput & {
	artifactId: string;
	formatVersion: number;
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
