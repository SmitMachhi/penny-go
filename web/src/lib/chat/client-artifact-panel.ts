import { markArtifactPanelOpen } from '$lib/chat/client-performance-flow.js';
import { persistSessionThreadCache } from '$lib/chat/client-session-cache.js';

import type { ChatClientState } from './client-state.js';

type LoadArtifacts = () => void;

export function openArtifactPanel(
	state: ChatClientState,
	artifactId: string,
	loadArtifacts: LoadArtifacts
): void {
	markArtifactPanelOpen();
	state.activeArtifactId = artifactId;
	state.artifactPanelOpen = true;
	state.artifactPanelDismissed = false;
	if (state.sessionKey) {
		loadArtifacts();
	}
	persistSessionThreadCache(state);
}

export function closeArtifactPanel(state: ChatClientState): void {
	state.artifactPanelOpen = false;
	state.artifactPanelDismissed = true;
	persistSessionThreadCache(state);
}

export function toggleArtifactPanel(
	state: ChatClientState,
	loadArtifacts: LoadArtifacts
): void {
	if (state.artifactPanelOpen) {
		closeArtifactPanel(state);
		return;
	}

	const artifactId = state.activeArtifactId ?? state.artifacts[0]?.artifactId;
	if (artifactId) {
		openArtifactPanel(state, artifactId, loadArtifacts);
	}
}
