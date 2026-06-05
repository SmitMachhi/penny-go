export type FundingConfidence = 'verified_live' | 'newly_discovered' | 'could_not_verify';

export type ArtifactTriggerReason = 'auto' | 'user_requested';

export type ArtifactProgramVerdict = 'pursue_now' | 'explore' | 'defer' | 'skip';

export type ArtifactEvidenceProgram = {
	name: string;
	officialUrl: string;
	confidence: FundingConfidence;
	verdict: ArtifactProgramVerdict;
};

export type ArtifactVerification = {
	verifiedAt: string;
	urlsChecked: string[];
	notes?: string;
};

export type ArtifactEvidence = {
	programs?: ArtifactEvidenceProgram[];
};

export type ArtifactMetaRecord = {
	artifactId: string;
	sessionUuid: string;
	title: string;
	latestVersion: number;
	formatVersion: number;
	triggerReason: ArtifactTriggerReason;
	createdAt: string;
	updatedAt: string;
	programCount: number;
	pdfAvailable: boolean;
	verification: ArtifactVerification;
	evidence?: ArtifactEvidence;
};

export type ArtifactVersionSnapshot = {
	version: number;
	title: string;
	triggerReason: ArtifactTriggerReason;
	createdAt: string;
	programCount: number;
	pdfAvailable: boolean;
	verification: ArtifactVerification;
	evidence?: ArtifactEvidence;
	changeSummary?: string;
};

export type CreateFundingArtifactInput = {
	title: string;
	triggerReason: ArtifactTriggerReason;
	bodyMarkdown: string;
	verification: ArtifactVerification;
	evidence?: ArtifactEvidence;
	changeSummary?: string;
};

export type CreateFundingArtifactParams = CreateFundingArtifactInput & {
	sessionUuid: string;
	artifactId?: string | undefined;
};

export type ArtifactValidationError = { field: string; message: string };

export type ArtifactValidationResult =
	| { ok: true; value: CreateFundingArtifactInput }
	| { ok: false; errors: ArtifactValidationError[] };
