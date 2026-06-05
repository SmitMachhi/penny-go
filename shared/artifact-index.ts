import type { ArtifactMetaRecord, ArtifactTriggerReason } from './artifact-types.ts';

type ArtifactIndexEntryBase = Pick<
	ArtifactMetaRecord,
	| 'artifactId'
	| 'sessionUuid'
	| 'title'
	| 'programCount'
	| 'latestVersion'
	| 'triggerReason'
	| 'createdAt'
	| 'updatedAt'
>;

export type ArtifactIndexEntry = ArtifactIndexEntryBase & {
	pdfAvailable?: boolean;
};

type LegacyArtifactIndexEntry = Partial<ArtifactIndexEntry> & { version?: unknown };

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
	return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function readTriggerReason(value: unknown): ArtifactTriggerReason | null {
	if (value === 'auto' || value === 'user_requested') {
		return value;
	}
	return null;
}

function readLatestVersion(entry: LegacyArtifactIndexEntry): number | null {
	if (typeof entry.latestVersion === 'number' && entry.latestVersion >= 1) {
		return entry.latestVersion;
	}
	if (typeof entry.version === 'number' && entry.version >= 1) {
		return entry.version;
	}
	return null;
}

export function buildArtifactIndexEntry(meta: ArtifactMetaRecord): ArtifactIndexEntry {
	return {
		artifactId: meta.artifactId,
		sessionUuid: meta.sessionUuid,
		title: meta.title,
		programCount: meta.programCount,
		latestVersion: meta.latestVersion,
		triggerReason: meta.triggerReason,
		createdAt: meta.createdAt,
		updatedAt: meta.updatedAt,
		pdfAvailable: meta.pdfAvailable
	};
}

export function normalizeArtifactIndexEntry(raw: unknown): ArtifactIndexEntry | null {
	if (!isRecord(raw)) {
		return null;
	}
	const record = raw as LegacyArtifactIndexEntry;
	const artifactId = readString(record.artifactId);
	const sessionUuid = readString(record.sessionUuid);
	const title = readString(record.title);
	const createdAt = readString(record.createdAt);
	const updatedAt = readString(record.updatedAt);
	const triggerReason = readTriggerReason(record.triggerReason);
	const latestVersion = readLatestVersion(record);
	const programCount = typeof record.programCount === 'number' ? record.programCount : null;
	if (
		!artifactId ||
		!sessionUuid ||
		!title ||
		!createdAt ||
		!updatedAt ||
		!triggerReason ||
		!latestVersion ||
		programCount === null
	) {
		return null;
	}
	return {
		artifactId,
		sessionUuid,
		title,
		programCount,
		latestVersion,
		triggerReason,
		createdAt,
		updatedAt,
		pdfAvailable: typeof record.pdfAvailable === 'boolean' ? record.pdfAvailable : undefined
	};
}

export function mergeArtifactIndexEntries(
	indexEntries: ArtifactIndexEntry[],
	diskEntries: ArtifactIndexEntry[]
): ArtifactIndexEntry[] {
	const byId = new Map<string, ArtifactIndexEntry>();
	for (const entry of diskEntries) {
		byId.set(entry.artifactId, entry);
	}
	for (const entry of indexEntries) {
		byId.set(entry.artifactId, entry);
	}
	return [...byId.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}
