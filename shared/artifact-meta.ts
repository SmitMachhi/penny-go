import type {
	ArtifactMetaRecord,
	ArtifactTriggerReason,
	ArtifactVerification,
	ArtifactVersionSnapshot,
	CreateFundingArtifactParams
} from '@penny/shared/artifact-types';
import {
	ARTIFACT_FORMAT_VERSION,
	LEGACY_ARTIFACT_FORMAT_VERSION,
	MIN_ARTIFACT_VERSION,
	TRIGGER_REASONS
} from '#artifact-validation-constants';
import { isOneOf, isRecord, readOptionalString } from '#artifact-validation-utils';

const LEGACY_VERIFICATION_NOTE =
	'Legacy artifact created before verification metadata was recorded.';

export type LegacyArtifactMetaRecord = {
	latestVersion?: unknown;
	version?: unknown;
};

export function resolveLatestVersion(meta: LegacyArtifactMetaRecord): number {
	if (typeof meta.latestVersion === 'number' && meta.latestVersion >= MIN_ARTIFACT_VERSION) {
		return meta.latestVersion;
	}
	if (typeof meta.version === 'number' && meta.version >= MIN_ARTIFACT_VERSION) {
		return meta.version;
	}
	return MIN_ARTIFACT_VERSION;
}

export function normalizeArtifactMetaRecord(raw: unknown): ArtifactMetaRecord | null {
	if (!isRecord(raw)) {
		return null;
	}
	const triggerReason = parseArtifactTriggerReason(raw.triggerReason);
	const verification = normalizeArtifactVerification(raw.verification, raw.updatedAt);
	if (
		typeof raw.artifactId !== 'string' ||
		typeof raw.sessionUuid !== 'string' ||
		typeof raw.title !== 'string' ||
		!triggerReason ||
		typeof raw.createdAt !== 'string' ||
		typeof raw.updatedAt !== 'string' ||
		typeof raw.programCount !== 'number' ||
		!verification
	) {
		return null;
	}

	const latestVersion = resolveLatestVersion(raw);
	const formatVersion =
		typeof raw.formatVersion === 'number'
			? raw.formatVersion
			: LEGACY_ARTIFACT_FORMAT_VERSION;
	return {
		artifactId: raw.artifactId,
		sessionUuid: raw.sessionUuid,
		title: raw.title,
		latestVersion,
		formatVersion,
		triggerReason,
		createdAt: raw.createdAt,
		updatedAt: raw.updatedAt,
		programCount: raw.programCount,
		pdfAvailable: typeof raw.pdfAvailable === 'boolean' ? raw.pdfAvailable : true,
		verification,
		evidence: isRecord(raw.evidence) ? raw.evidence : undefined
	};
}

function parseArtifactTriggerReason(value: unknown): ArtifactTriggerReason | null {
	return typeof value === 'string' && isOneOf(TRIGGER_REASONS, value) ? value : null;
}

function normalizeArtifactVerification(
	value: unknown,
	updatedAt: unknown
): ArtifactVerification | null {
	if (value === undefined) {
		return typeof updatedAt === 'string'
			? {
					verifiedAt: updatedAt,
					urlsChecked: [],
					notes: LEGACY_VERIFICATION_NOTE
				}
			: null;
	}
	if (!isRecord(value) || typeof value.verifiedAt !== 'string' || !Array.isArray(value.urlsChecked)) {
		return null;
	}
	if (!value.urlsChecked.every((url) => typeof url === 'string')) {
		return null;
	}
	return {
		verifiedAt: value.verifiedAt,
		urlsChecked: value.urlsChecked,
		notes: readOptionalString(value.notes)
	};
}

export function buildArtifactMetaRecord(
	params: CreateFundingArtifactParams,
	artifactId: string,
	latestVersion: number,
	timestamps: { createdAt: string; updatedAt: string },
	pdfAvailable = true
): ArtifactMetaRecord {
	const programCount = params.evidence?.programs?.length ?? 0;
	return {
		artifactId,
		sessionUuid: params.sessionUuid,
		title: params.title,
		latestVersion,
		formatVersion: ARTIFACT_FORMAT_VERSION,
		triggerReason: params.triggerReason,
		createdAt: timestamps.createdAt,
		updatedAt: timestamps.updatedAt,
		programCount,
		pdfAvailable,
		verification: params.verification,
		evidence: params.evidence
	};
}

export function buildArtifactVersionSnapshot(
	params: CreateFundingArtifactParams,
	version: number,
	updatedAt: string,
	pdfAvailable: boolean
): ArtifactVersionSnapshot {
	const programCount = params.evidence?.programs?.length ?? 0;
	return {
		version,
		title: params.title,
		triggerReason: params.triggerReason,
		createdAt: updatedAt,
		programCount,
		pdfAvailable,
		verification: params.verification,
		evidence: params.evidence,
		changeSummary: params.changeSummary
	};
}
