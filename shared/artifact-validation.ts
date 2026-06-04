import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import type {
	ArtifactEvidence,
	ArtifactEvidenceProgram,
	ArtifactMetaRecord,
	ArtifactTriggerReason,
	ArtifactValidationError,
	ArtifactValidationResult,
	ArtifactVerification,
	ArtifactVersionSnapshot,
	CreateFundingArtifactInput,
	CreateFundingArtifactParams,
	FundingConfidence
} from '@penny/shared/artifact-types';
import { repairVersionPdfFromLegacy, resolveArtifactPdfPaths } from '@penny/shared/artifact-pdf-locations';
import {
	DOCUMENT_MD_FILENAME,
	formatArtifactVersionSegment,
	META_FILENAME,
	PDF_FILENAME,
	resolveArtifactDir,
	resolveArtifactFilePath,
	resolveArtifactVersionDir,
	resolveArtifactVersionFilePath,
	VERSION_META_FILENAME,
	VERSIONS_DIR
} from '@penny/shared/penny-paths';

export const MAX_EVIDENCE_PROGRAMS = 5;
export const ARTIFACT_FORMAT_VERSION = 5;
export const MAX_CHANGE_SUMMARY_LENGTH = 280;
const LEGACY_ARTIFACT_FORMAT_VERSION = 1;
const LEGACY_VERIFICATION_NOTE =
	'Legacy artifact created before verification metadata was recorded.';

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
	const changeSummary = readOptionalString(input.changeSummary);
	if (changeSummary && changeSummary.length > MAX_CHANGE_SUMMARY_LENGTH) {
		errors.push({
			field: 'changeSummary',
			message: `at most ${MAX_CHANGE_SUMMARY_LENGTH} characters`
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

type LegacyArtifactMetaRecord = {
	latestVersion?: unknown;
	version?: unknown;
};

export function resolveLatestVersion(meta: LegacyArtifactMetaRecord): number {
	if (typeof meta.latestVersion === 'number' && meta.latestVersion >= 1) {
		return meta.latestVersion;
	}
	if (typeof meta.version === 'number' && meta.version >= 1) {
		return meta.version;
	}
	return 1;
}

export function normalizeArtifactMetaRecord(raw: unknown): ArtifactMetaRecord | null {
	if (typeof raw !== 'object' || raw === null) {
		return null;
	}
	const record = raw as Record<string, unknown> & LegacyArtifactMetaRecord;
	const triggerReason = parseArtifactTriggerReason(record.triggerReason);
	const verification = normalizeArtifactVerification(record.verification, record.updatedAt);
	if (
		typeof record.artifactId !== 'string' ||
		typeof record.sessionUuid !== 'string' ||
		typeof record.title !== 'string' ||
		!triggerReason ||
		typeof record.createdAt !== 'string' ||
		typeof record.updatedAt !== 'string' ||
		typeof record.programCount !== 'number' ||
		!verification
	) {
		return null;
	}

	const latestVersion = resolveLatestVersion(record);
	const formatVersion =
		typeof record.formatVersion === 'number'
			? record.formatVersion
			: LEGACY_ARTIFACT_FORMAT_VERSION;
	return {
		artifactId: record.artifactId,
		sessionUuid: record.sessionUuid,
		title: record.title,
		latestVersion,
		formatVersion,
		triggerReason,
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
		programCount: record.programCount,
		pdfAvailable: typeof record.pdfAvailable === 'boolean' ? record.pdfAvailable : true,
		verification,
		evidence: isRecord(record.evidence) ? record.evidence : undefined
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

type MigrateArtifactOptions = {
	repoRoot: string;
	sessionUuid: string;
	artifactId: string;
};

export async function ensureArtifactFormatV5(
	options: MigrateArtifactOptions
): Promise<ArtifactMetaRecord | null> {
	const metaPath = resolveArtifactFilePath(
		options.repoRoot,
		options.sessionUuid,
		options.artifactId,
		META_FILENAME
	);
	let rawMeta: unknown;
	try {
		rawMeta = JSON.parse(await readFile(metaPath, 'utf8')) as unknown;
	} catch {
		return null;
	}

	const normalized = normalizeArtifactMetaRecord(rawMeta);
	if (!normalized) {
		return null;
	}

	const existingVersions = await listArtifactVersionNumbers(
		options.repoRoot,
		options.sessionUuid,
		options.artifactId
	);
	if (normalized.formatVersion >= ARTIFACT_FORMAT_VERSION && existingVersions.length > 0) {
		await repairVersionPdfFromLegacy(
			resolveArtifactPdfPaths(
				options.repoRoot,
				options.sessionUuid,
				options.artifactId,
				normalized.latestVersion
			)
		);
		return normalized;
	}

	return migrateFlatArtifactToVersioned(options, normalized, rawMeta);
}

async function migrateFlatArtifactToVersioned(
	options: MigrateArtifactOptions,
	normalized: ArtifactMetaRecord,
	rawMeta: unknown
): Promise<ArtifactMetaRecord> {
	const latestVersion = resolveLatestVersion(
		typeof rawMeta === 'object' && rawMeta !== null ? (rawMeta as LegacyArtifactMetaRecord) : normalized
	);
	const versionDir = resolveArtifactVersionDir(
		options.repoRoot,
		options.sessionUuid,
		options.artifactId,
		latestVersion
	);
	await mkdir(versionDir, { recursive: true });

	const legacyDocumentPath = resolveArtifactFilePath(
		options.repoRoot,
		options.sessionUuid,
		options.artifactId,
		DOCUMENT_MD_FILENAME
	);
	const legacyPdfPath = resolveArtifactFilePath(
		options.repoRoot,
		options.sessionUuid,
		options.artifactId,
		PDF_FILENAME
	);
	const versionDocumentPath = resolveArtifactVersionFilePath(
		options.repoRoot,
		options.sessionUuid,
		options.artifactId,
		latestVersion,
		DOCUMENT_MD_FILENAME
	);
	const versionPdfPath = resolveArtifactVersionFilePath(
		options.repoRoot,
		options.sessionUuid,
		options.artifactId,
		latestVersion,
		PDF_FILENAME
	);

	await copyIfExists(legacyDocumentPath, versionDocumentPath);
	await copyIfExists(legacyPdfPath, versionPdfPath);

	const snapshot = buildArtifactVersionSnapshot(
		{
			sessionUuid: normalized.sessionUuid,
			title: normalized.title,
			triggerReason: normalized.triggerReason,
			bodyMarkdown: '',
			verification: normalized.verification,
			evidence: normalized.evidence
		},
		latestVersion,
		normalized.updatedAt,
		normalized.pdfAvailable
	);
	const snapshotPath = resolveArtifactVersionFilePath(
		options.repoRoot,
		options.sessionUuid,
		options.artifactId,
		latestVersion,
		VERSION_META_FILENAME
	);
	await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');

	const upgraded: ArtifactMetaRecord = {
		...normalized,
		latestVersion,
		formatVersion: ARTIFACT_FORMAT_VERSION
	};
	const metaPath = resolveArtifactFilePath(
		options.repoRoot,
		options.sessionUuid,
		options.artifactId,
		META_FILENAME
	);
	await writeFile(metaPath, `${JSON.stringify(upgraded, null, 2)}\n`, 'utf8');

	await rm(legacyDocumentPath, { force: true });
	await rm(legacyPdfPath, { force: true });

	return upgraded;
}

async function copyIfExists(sourcePath: string, destinationPath: string): Promise<void> {
	try {
		await stat(sourcePath);
	} catch {
		return;
	}
	await copyFile(sourcePath, destinationPath);
}

export async function listArtifactVersionNumbers(
	repoRoot: string,
	sessionUuid: string,
	artifactId: string
): Promise<number[]> {
	const versionsRoot = resolve(resolveArtifactDir(repoRoot, sessionUuid, artifactId), VERSIONS_DIR);
	let entries: string[] = [];
	try {
		entries = await readdir(versionsRoot);
	} catch {
		return [];
	}

	return entries
		.map((entry) => Number.parseInt(entry, 10))
		.filter((version) => Number.isInteger(version) && version >= 1)
		.sort((left, right) => left - right);
}

export function isValidArtifactVersion(version: number, latestVersion: number): boolean {
	return Number.isInteger(version) && version >= 1 && version <= latestVersion;
}

export { formatArtifactVersionSegment };
