import {
	artifactPdfExists,
	getLatestSessionArtifact,
	toArtifactSummary
} from '$lib/server/artifact-storage.js';
import type { SsePayload } from '$lib/chat/stream-events.js';

export const CREATE_FUNDING_BRIEF_TOOL = 'create_funding_brief';

export async function buildArtifactSseForToolDone(
	sessionKey: string,
	toolName: string,
	runId: string
): Promise<SsePayload | null> {
	if (toolName !== CREATE_FUNDING_BRIEF_TOOL) {
		return null;
	}

	const artifact = await getLatestSessionArtifact(sessionKey);
	if (!artifact) {
		return null;
	}

	const pdfAvailable = await artifactPdfExists(
		sessionKey,
		artifact.artifactId,
		artifact.latestVersion
	);

	return {
		type: artifact.latestVersion > 1 ? 'artifact.update' : 'artifact.create',
		runId,
		artifact: toArtifactSummary(artifact, pdfAvailable)
	};
}
