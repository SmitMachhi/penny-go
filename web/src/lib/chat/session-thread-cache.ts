import type { ArtifactSummary } from '$lib/chat/artifacts.js';
import type { ChatMessage } from '$lib/chat/messages.js';

export type SessionThreadSnapshot = {
	sessionId: string | null;
	messages: ChatMessage[];
	artifacts: ArtifactSummary[];
	activeArtifactId: string | null;
	artifactPanelOpen: boolean;
	artifactPanelDismissed: boolean;
};

const sessionThreadCache = new Map<string, SessionThreadSnapshot>();

export function readSessionThreadCache(sessionKey: string): SessionThreadSnapshot | null {
	const cached = sessionThreadCache.get(sessionKey);
	if (!cached) {
		return null;
	}
	return {
		sessionId: cached.sessionId,
		messages: [...cached.messages],
		artifacts: [...cached.artifacts],
		activeArtifactId: cached.activeArtifactId,
		artifactPanelOpen: cached.artifactPanelOpen,
		artifactPanelDismissed: cached.artifactPanelDismissed
	};
}

export function writeSessionThreadCache(sessionKey: string, snapshot: SessionThreadSnapshot): void {
	sessionThreadCache.set(sessionKey, {
		sessionId: snapshot.sessionId,
		messages: [...snapshot.messages],
		artifacts: [...snapshot.artifacts],
		activeArtifactId: snapshot.activeArtifactId,
		artifactPanelOpen: snapshot.artifactPanelOpen,
		artifactPanelDismissed: snapshot.artifactPanelDismissed
	});
}

export function clearSessionThreadCache(sessionKey: string): void {
	sessionThreadCache.delete(sessionKey);
}

export function forgetSessionThreadCache(sessionKey: string): void {
	clearSessionThreadCache(sessionKey);
}
