import type {
	ArtifactProgramVerdict,
	ArtifactTriggerReason,
	FundingConfidence
} from '@penny/shared/artifact-types';

export const MIN_ARTIFACT_VERSION = 1;
export const MAX_EVIDENCE_PROGRAMS = 5;
export const ARTIFACT_FORMAT_VERSION = 5;
export const MAX_CHANGE_SUMMARY_LENGTH = 280;
export const LEGACY_ARTIFACT_FORMAT_VERSION = MIN_ARTIFACT_VERSION;

export const CONFIDENCE_LABELS = [
	'verified_live',
	'newly_discovered',
	'could_not_verify'
] as const satisfies readonly FundingConfidence[];

export const TRIGGER_REASONS = ['auto', 'user_requested'] as const satisfies readonly ArtifactTriggerReason[];

export const PROGRAM_VERDICTS = [
	'pursue_now',
	'explore',
	'defer',
	'skip'
] as const satisfies readonly ArtifactProgramVerdict[];
