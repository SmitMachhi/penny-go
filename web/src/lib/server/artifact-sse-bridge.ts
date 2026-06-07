import {
	artifactPdfExists,
	getLatestSessionArtifact,
	toArtifactSummary
} from '$lib/server/artifact-storage.js';
import { isFundingBriefTool } from '$lib/chat/artifact-tools.js';
import type { SsePayload } from '$lib/chat/stream-events.js';

export async function buildArtifactSseForToolDone(
	sessionKey: string,
	toolName: string,
	runId: string
): Promise<SsePayload | null> {
	if (!isFundingBriefTool(toolName)) {
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
