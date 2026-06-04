import type { SessionThreadSnapshot } from '$lib/chat/session-thread-cache.js';

export type SessionThreadCacheStorage = {
	read: (sessionKey: string) => Promise<SessionThreadSnapshot | null>;
	write: (sessionKey: string, snapshot: SessionThreadSnapshot) => Promise<void>;
	delete: (sessionKey: string) => Promise<void>;
};

type PersistedSessionThreadSnapshot = SessionThreadSnapshot & {
	sessionKey: string;
	schemaVersion: number;
};

const THREAD_CACHE_DB_NAME = 'penny-thread-cache';
const THREAD_CACHE_STORE_NAME = 'thread_snapshot';
const THREAD_CACHE_DB_VERSION = 1;
const THREAD_CACHE_SCHEMA_VERSION = 1;

function hasIndexedDb(): boolean {
	return typeof indexedDB !== 'undefined';
}

function openThreadCacheDatabase(): Promise<IDBDatabase | null> {
	if (!hasIndexedDb()) {
		return Promise.resolve(null);
	}
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(THREAD_CACHE_DB_NAME, THREAD_CACHE_DB_VERSION);
		request.onupgradeneeded = () => {
			request.result.createObjectStore(THREAD_CACHE_STORE_NAME, { keyPath: 'sessionKey' });
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error ?? new Error('indexeddb_open_failed'));
	});
}

function normalizePersistedSnapshot(raw: unknown): SessionThreadSnapshot | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const record = raw as Partial<PersistedSessionThreadSnapshot>;
	if (record.schemaVersion !== THREAD_CACHE_SCHEMA_VERSION || !Array.isArray(record.messages)) {
		return null;
	}
	return {
		sessionId: typeof record.sessionId === 'string' ? record.sessionId : null,
		messages: record.messages,
		artifacts: Array.isArray(record.artifacts) ? record.artifacts : [],
		activeArtifactId: typeof record.activeArtifactId === 'string' ? record.activeArtifactId : null,
		artifactPanelOpen: record.artifactPanelOpen === true,
		artifactPanelDismissed: record.artifactPanelDismissed === true
	};
}

function runStoreRequest<T>(
	mode: IDBTransactionMode,
	buildRequest: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T | null> {
	return openThreadCacheDatabase().then(
		(database) =>
			new Promise((resolve, reject) => {
				if (!database) {
					resolve(null);
					return;
				}
				const transaction = database.transaction(THREAD_CACHE_STORE_NAME, mode);
				const request = buildRequest(transaction.objectStore(THREAD_CACHE_STORE_NAME));
				request.onsuccess = () => resolve(request.result ?? null);
				request.onerror = () => reject(request.error ?? new Error('indexeddb_request_failed'));
			})
	);
}

export const indexedDbSessionThreadCacheStorage: SessionThreadCacheStorage = {
	async read(sessionKey) {
		return normalizePersistedSnapshot(
			await runStoreRequest('readonly', (store) => store.get(sessionKey))
		);
	},
	async write(sessionKey, snapshot) {
		await runStoreRequest('readwrite', (store) =>
			store.put({ ...snapshot, sessionKey, schemaVersion: THREAD_CACHE_SCHEMA_VERSION })
		);
	},
	async delete(sessionKey) {
		await runStoreRequest('readwrite', (store) => store.delete(sessionKey));
	}
};
