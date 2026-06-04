import type { ArtifactSummary } from '$lib/chat/artifacts.js';
import type { ChatMessage } from '$lib/chat/messages.js';
import {
	indexedDbSessionThreadCacheStorage,
	type SessionThreadCacheStorage
} from '$lib/chat/session-thread-indexeddb.js';

export type SessionThreadSnapshot = {
	sessionId: string | null;
	messages: ChatMessage[];
	artifacts: ArtifactSummary[];
	activeArtifactId: string | null;
	artifactPanelOpen: boolean;
	artifactPanelDismissed: boolean;
};

const sessionThreadCache = new Map<string, SessionThreadSnapshot>();
let persistentStorage: SessionThreadCacheStorage | null = indexedDbSessionThreadCacheStorage;

function ignoreStorageFailure(operation: Promise<void> | void): void {
	void Promise.resolve(operation).catch(() => {});
}

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
	ignoreStorageFailure(persistentStorage?.write(sessionKey, cloned));
}

export function clearSessionThreadCache(sessionKey: string): void {
	sessionThreadCache.delete(sessionKey);
}

export function forgetSessionThreadCache(sessionKey: string): void {
	clearSessionThreadCache(sessionKey);
	ignoreStorageFailure(persistentStorage?.delete(sessionKey));
}

export async function hydrateSessionThreadCache(
	sessionKey: string
): Promise<SessionThreadSnapshot | null> {
	const cached = readSessionThreadCache(sessionKey);
	if (cached) {
		return cached;
	}
	const persisted = await persistentStorage?.read(sessionKey).catch(() => null);
	if (!persisted) {
		return null;
	}
	const cloned = cloneSnapshot(persisted);
	sessionThreadCache.set(sessionKey, cloned);
	return cloneSnapshot(cloned);
}

export function setSessionThreadCacheStorageForTests(
	storage: SessionThreadCacheStorage | null
): void {
	persistentStorage = storage;
}
