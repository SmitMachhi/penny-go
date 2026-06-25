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

function cloneSnapshot(snapshot: SessionThreadSnapshot): SessionThreadSnapshot {
	return {
		sessionId: snapshot.sessionId,
		messages: [...snapshot.messages],
		artifacts: [...snapshot.artifacts],
		activeArtifactId: snapshot.activeArtifactId,
		artifactPanelOpen: snapshot.artifactPanelOpen,
		artifactPanelDismissed: snapshot.artifactPanelDismissed
	};
}

export function readSessionThreadCache(sessionKey: string): SessionThreadSnapshot | null {
	const cached = sessionThreadCache.get(sessionKey);
	if (!cached) {
		return null;
	}
	return cloneSnapshot(cached);
}

export function writeSessionThreadCache(sessionKey: string, snapshot: SessionThreadSnapshot): void {
	const cloned = cloneSnapshot(snapshot);
	sessionThreadCache.set(sessionKey, cloned);
}

export function clearSessionThreadCache(sessionKey: string): void {
	sessionThreadCache.delete(sessionKey);
}

export function forgetSessionThreadCache(sessionKey: string): void {
	clearSessionThreadCache(sessionKey);
}

export async function hydrateSessionThreadCache(
	sessionKey: string
): Promise<SessionThreadSnapshot | null> {
	const cached = readSessionThreadCache(sessionKey);
	if (cached) {
		return cached;
	}
	return null;
}
