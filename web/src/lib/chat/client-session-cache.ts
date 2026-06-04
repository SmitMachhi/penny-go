import type { ChatClientState } from '$lib/chat/client-state.js';
import { writeSessionThreadCache } from '$lib/chat/session-thread-cache.js';

export function persistSessionThreadCache(state: ChatClientState): void {
	if (!state.sessionKey) {
		return;
	}
	writeSessionThreadCache(state.sessionKey, {
		sessionId: state.sessionId,
		messages: state.messages,
		artifacts: state.artifacts,
		activeArtifactId: state.activeArtifactId,
		artifactPanelOpen: state.artifactPanelOpen,
		artifactPanelDismissed: state.artifactPanelDismissed
	});
}
