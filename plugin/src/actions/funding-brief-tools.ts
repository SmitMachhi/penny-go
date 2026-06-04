import { validateCreateFundingArtifactInput } from '@penny/shared/artifact-validation';
import type { CreateFundingArtifactParams } from '@penny/shared/artifact-types';

import type { PennyToolsConfigShape } from '../services/penny-config.js';
import { resolveRepoRoot } from '../services/penny-config.js';
import {
	createArtifactId,
	loadArtifactMetaRecord,
	persistArtifactFilesAllowPdfFailure
} from '../services/artifact-storage.js';

export type CreateFundingBriefParams = CreateFundingArtifactParams;

export async function createFundingBriefAction(
	config: PennyToolsConfigShape,
	params: CreateFundingBriefParams,
	signal?: AbortSignal | undefined
) {
	const validation = validateCreateFundingArtifactInput(params);
	if (!validation.ok) {
		return {
			success: false as const,
			error: 'validation_failed',
			details: validation.errors
		};
	}

	const repoRoot = resolveRepoRoot(config);
	const now = new Date().toISOString();
	const artifactId = params.artifactId?.trim() || createArtifactId();
	const existing = params.artifactId
		? await loadArtifactMetaRecord(repoRoot, params.sessionUuid, artifactId)
		: null;

	const version = existing ? existing.latestVersion + 1 : 1;
	const createdAt = existing?.createdAt ?? now;

	const fullParams: CreateFundingArtifactParams = {
		...validation.value,
		sessionUuid: params.sessionUuid,
		artifactId
	};

	const persisted = await persistArtifactFilesAllowPdfFailure({
		config,
		repoRoot,
		params: fullParams,
		artifactId,
		version,
		createdAt,
		updatedAt: now,
		signal
	});

	if (!persisted.pdfOk) {
		return {
			success: false as const,
			error: persisted.pdfError ?? 'pdf_render_failed',
			artifactId,
			sessionUuid: params.sessionUuid,
			documentPath: persisted.documentPath,
			version
		};
	}

	return {
		success: true as const,
		artifactId,
		sessionUuid: params.sessionUuid,
		title: fullParams.title,
		programCount: persisted.meta.programCount,
		documentPath: persisted.documentPath,
		pdfPath: persisted.pdfPath,
		version,
		latestVersion: persisted.meta.latestVersion
	};
}
