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
const SESSION_STORAGE_PREFIX = 'penny-thread:';
const SESSION_STORAGE_MESSAGE_LIMIT = 80;

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

function trimSnapshotForStorage(snapshot: SessionThreadSnapshot): SessionThreadSnapshot {
	if (snapshot.messages.length <= SESSION_STORAGE_MESSAGE_LIMIT) {
		return snapshot;
	}
	return {
		...snapshot,
		messages: snapshot.messages.slice(-SESSION_STORAGE_MESSAGE_LIMIT)
	};
}

function canUseSessionStorage(): boolean {
	return typeof sessionStorage !== 'undefined';
}

function readStoredSnapshot(sessionKey: string): SessionThreadSnapshot | null {
	if (!canUseSessionStorage()) {
		return null;
	}
	try {
		const raw = sessionStorage.getItem(`${SESSION_STORAGE_PREFIX}${sessionKey}`);
		if (!raw) {
			return null;
		}
		const parsed = JSON.parse(raw) as SessionThreadSnapshot;
		if (!parsed || !Array.isArray(parsed.messages)) {
			return null;
		}
		return cloneSnapshot(parsed);
	} catch {
		return null;
	}
}

function writeStoredSnapshot(sessionKey: string, snapshot: SessionThreadSnapshot): void {
	if (!canUseSessionStorage()) {
		return;
	}
	try {
		sessionStorage.setItem(
			`${SESSION_STORAGE_PREFIX}${sessionKey}`,
			JSON.stringify(trimSnapshotForStorage(snapshot))
		);
	} catch {
		// Quota or privacy mode — in-memory cache still works for same-tab navigation.
	}
}

function removeStoredSnapshot(sessionKey: string): void {
	if (!canUseSessionStorage()) {
		return;
	}
	try {
		sessionStorage.removeItem(`${SESSION_STORAGE_PREFIX}${sessionKey}`);
	} catch {
		// ignore
	}
}

export function readSessionThreadCache(sessionKey: string): SessionThreadSnapshot | null {
	const cached = sessionThreadCache.get(sessionKey);
	if (cached) {
		return cloneSnapshot(cached);
	}
	const stored = readStoredSnapshot(sessionKey);
	if (stored) {
		sessionThreadCache.set(sessionKey, cloneSnapshot(stored));
		return stored;
	}
	return null;
}

export function writeSessionThreadCache(sessionKey: string, snapshot: SessionThreadSnapshot): void {
	const cloned = cloneSnapshot(snapshot);
	sessionThreadCache.set(sessionKey, cloned);
	writeStoredSnapshot(sessionKey, cloned);
}

export function clearSessionThreadCache(sessionKey: string): void {
	sessionThreadCache.delete(sessionKey);
}

export function forgetSessionThreadCache(sessionKey: string): void {
	clearSessionThreadCache(sessionKey);
	removeStoredSnapshot(sessionKey);
}

export async function hydrateSessionThreadCache(
	sessionKey: string
): Promise<SessionThreadSnapshot | null> {
	return readSessionThreadCache(sessionKey);
}

export function resetSessionThreadCacheForTests(): void {
	sessionThreadCache.clear();
}
