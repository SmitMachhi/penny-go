import type { ArtifactSummary } from '$lib/chat/artifacts.js';

import type { ChatClientState } from './client-state.js';

export function applyLoadedArtifacts(state: ChatClientState, artifacts: ArtifactSummary[]): void {
	state.artifacts = artifacts;
	if (artifacts.length > 0) {
		state.artifactPanelOpen = true;
	}
	if (!state.activeArtifactId && artifacts[0]) {
		state.activeArtifactId = artifacts[0].artifactId;
	}
}

export function rememberArtifactId(artifactIds: string[], artifactId: string): void {
	if (!artifactIds.includes(artifactId)) {
		artifactIds.push(artifactId);
	}
}

export function syncLatestArtifact(state: ChatClientState, artifactIds: string[]): void {
	const latest = state.artifacts[0];
	if (!latest) {
		return;
	}
	state.artifactPanelOpen = true;
	state.activeArtifactId = latest.artifactId;
	rememberArtifactId(artifactIds, latest.artifactId);
}

export function upsertArtifact(state: ChatClientState, artifact: ArtifactSummary): void {
	const existingIndex = state.artifacts.findIndex((entry) => entry.artifactId === artifact.artifactId);
	if (existingIndex >= 0) {
		state.artifacts = state.artifacts.map((entry, index) =>
			index === existingIndex ? artifact : entry
		);
		return;
	}
	state.artifacts = [artifact, ...state.artifacts];
}
