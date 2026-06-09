import { Type } from '@sinclair/typebox';
import {
	MAX_EVIDENCE_PROGRAMS,
	validateCreateFundingArtifactInput
} from '@penny/shared/artifact-validation';
import type { ArtifactEvidenceProgram } from '@penny/shared/artifact-types';
import type { AnyAgentTool } from 'openclaw/plugin-sdk/plugin-entry';

import { createFundingBriefAction } from '../actions/funding-brief-tools.js';
import { resolveArtifactSessionUuid } from '../services/artifact-session.js';
import type { PennyToolsConfigShape } from '../services/penny-config.js';
import { toToolJsonResult } from '../services/tool-result.js';

export const publishFundingBriefParameters = Type.Object({
	title: Type.String(),
	bodyMarkdown: Type.String({
		description:
			'Full funding brief + strategy in markdown. Include GFM tables, bullets, and - [ ] task lists.'
	}),
	verifiedUrls: Type.Array(
		Type.String({
			description: 'Official URLs successfully checked with read_official_source.'
		})
	),
	notes: Type.Optional(
		Type.String({
			description: 'Short verification note. Do not include raw page dumps.'
		})
	)
});

export const publishFundingBriefToolDefinition = {
	name: 'publish_funding_brief',
	label: 'Publish funding artifact',
	description:
		'Create or update a funding brief PDF for the active chat session. Provide the full markdown document and official URLs; Penny fills artifact metadata.',
	parameters: publishFundingBriefParameters
} as const;

type PublishFundingBriefAction = typeof createFundingBriefAction;

type PublishFundingBriefArgs = {
	title: string;
	bodyMarkdown: string;
	verifiedUrls: string[];
	notes?: string | undefined;
};

const OFFICIAL_SOURCE_NAME_PREFIX = 'Verified official source';
const FIRST_DISPLAY_ORDINAL = 1;
const WWW_PREFIX_PATTERN = /^www\./i;

export function publishFundingBriefTool(
	config: PennyToolsConfigShape,
	sessionKey: string | undefined,
	action: PublishFundingBriefAction = createFundingBriefAction
): AnyAgentTool {
	return {
		...publishFundingBriefToolDefinition,
		execute: async (_toolCallId, params, signal) => {
			const sessionUuid = resolveArtifactSessionUuid(sessionKey);
			if (!sessionUuid) {
				return toToolJsonResult({
					success: false,
					error: 'invalid_session_key',
					message:
						'Funding artifacts require a Penny web chat session or local penny-* session.'
				});
			}

			const args = normalizePublishFundingBriefArgs(params);
			if (!args) {
				return toToolJsonResult({
					success: false,
					error: 'validation_failed',
					details: [{ field: 'verifiedUrls', message: 'at least one official URL required' }]
				});
			}

			const artifactParams = {
				sessionUuid,
				title: args.title,
				triggerReason: 'auto' as const,
				bodyMarkdown: args.bodyMarkdown,
				evidence: {
					programs: buildEvidencePrograms(args.verifiedUrls)
				},
				verification: {
					verifiedAt: new Date().toISOString(),
					urlsChecked: args.verifiedUrls,
					notes: args.notes
				}
			};
			const validation = validateCreateFundingArtifactInput(artifactParams);
			if (!validation.ok) {
				return toToolJsonResult({
					success: false,
					error: 'validation_failed',
					details: validation.errors
				});
			}

			const result = await action(
				config,
				{
					...validation.value,
					sessionUuid
				},
				signal
			);
			return toToolJsonResult(result);
		}
	};
}

function normalizePublishFundingBriefArgs(params: unknown): PublishFundingBriefArgs | null {
	if (!params || typeof params !== 'object' || Array.isArray(params)) {
		return null;
	}
	const record = params as Record<string, unknown>;
	const title = readRequiredString(record.title);
	const bodyMarkdown = readRequiredString(record.bodyMarkdown);
	const verifiedUrls = readVerifiedUrls(record.verifiedUrls);
	if (!title || !bodyMarkdown || verifiedUrls.length === 0) {
		return null;
	}
	return {
		title,
		bodyMarkdown,
		verifiedUrls,
		notes: readOptionalString(record.notes)
	};
}

function readRequiredString(value: unknown): string | null {
	if (typeof value !== 'string') {
		return null;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function readOptionalString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function readVerifiedUrls(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}
	const urls: string[] = [];
	for (const entry of value) {
		const url = readRequiredString(entry);
		if (url) {
			urls.push(url);
		}
	}
	return urls;
}

function buildEvidencePrograms(verifiedUrls: string[]): ArtifactEvidenceProgram[] {
	return verifiedUrls.slice(0, MAX_EVIDENCE_PROGRAMS).map((officialUrl, index) => ({
		name: sourceNameForUrl(officialUrl, index),
		officialUrl,
		confidence: 'verified_live',
		verdict: 'explore'
	}));
}

function sourceNameForUrl(officialUrl: string, index: number): string {
	try {
		const hostname = new URL(officialUrl).hostname.replace(WWW_PREFIX_PATTERN, '');
		if (hostname.length > 0) {
			return hostname;
		}
	} catch {
		return `${OFFICIAL_SOURCE_NAME_PREFIX} ${index + FIRST_DISPLAY_ORDINAL}`;
	}
	return `${OFFICIAL_SOURCE_NAME_PREFIX} ${index + FIRST_DISPLAY_ORDINAL}`;
}
