import type { FundingBriefInput } from '@penny/shared/funding-brief';

import { validateFundingBriefInput } from '../domain/funding-brief.js';
import type { PennyToolsConfigShape } from '../services/penny-config.js';
import { resolveRepoRoot } from '../services/penny-config.js';
import { renderFundingBriefPdf } from '../services/funding-brief-pdf.js';
import { renderFundingBriefSlidesHtml } from '../services/funding-brief-slides.js';
import {
	buildArtifactMeta,
	buildFundingBriefRecord,
	createArtifactId,
	loadFundingBriefRecord,
	persistFundingBriefFiles
} from '../services/funding-brief-storage.js';

export type CreateFundingBriefParams = FundingBriefInput & {
	artifactId?: string | undefined;
};

export async function createFundingBriefAction(
	config: PennyToolsConfigShape,
	params: CreateFundingBriefParams,
	signal?: AbortSignal | undefined
) {
	const validation = validateFundingBriefInput(params);
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
		? await loadFundingBriefRecord(repoRoot, validation.value.sessionUuid, artifactId)
		: null;
	const version = existing ? existing.version + 1 : 1;
	const createdAt = existing?.createdAt ?? now;

	const record = buildFundingBriefRecord(validation.value, artifactId, version, {
		createdAt,
		updatedAt: now
	});
	const meta = buildArtifactMeta(record);
	const slidesHtml = await renderFundingBriefSlidesHtml(record, repoRoot);

	const persisted = await persistFundingBriefFiles({
		repoRoot,
		record,
		meta,
		slidesHtml
	});

	const pdfResult = await renderFundingBriefPdf(
		config,
		persisted.slidesPath,
		persisted.pdfPath,
		signal
	);

	if (!pdfResult.success) {
		return {
			success: false as const,
			error: pdfResult.error ?? 'pdf_render_failed',
			artifactId,
			sessionUuid: record.sessionUuid,
			previewPath: persisted.slidesPath,
			version
		};
	}

	return {
		success: true as const,
		artifactId,
		sessionUuid: record.sessionUuid,
		title: record.title,
		programCount: record.programs.length,
		previewPath: persisted.slidesPath,
		pdfPath: persisted.pdfPath,
		version
	};
}
