import { getLatestSessionArtifact } from '$lib/server/artifact-storage.js';
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

	return {
		type: artifact.version > 1 ? 'artifact.update' : 'artifact.create',
		runId,
		artifact: {
			artifactId: artifact.artifactId,
			title: artifact.title,
			programCount: artifact.programCount,
			version: artifact.version,
			updatedAt: artifact.updatedAt
		}
	};
}
