import { readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { ENCRYPTION_ENVELOPE_PREFIX, isEncryptedEnvelope } from '@penny/shared/app-encryption';
import { readSecureTextFile, writeSecureTextFile } from '@penny/shared/app-encryption';

import { resolveWorkspaceRoot } from '$lib/server/penny-config.js';
import { sessionContentKeyFor } from '$lib/server/penny-encryption.js';
import { resolveSessionKey } from '$lib/server/session-key.js';

const OPENCLAW_AGENT_ID = 'main';
const OPENCLAW_SESSIONS_DIR_SEGMENTS = ['agents', OPENCLAW_AGENT_ID, 'sessions'] as const;
const OPENCLAW_SESSIONS_INDEX_FILE = 'sessions.json';

type OpenClawSessionIndexEntry = {
	sessionFile?: string;
	sessionId?: string;
};

const transcriptQueues = new Map<string, Promise<unknown>>();

function openClawStateDir(): string {
	return process.env.OPENCLAW_STATE_DIR?.trim() || join(resolveWorkspaceRoot(), '.openclaw-state');
}

async function runTranscriptOperation<T>(sessionKey: string, operation: () => Promise<T>): Promise<T> {
	const normalized = resolveSessionKey(sessionKey);
	const previous = transcriptQueues.get(normalized) ?? Promise.resolve();
	const next = previous.catch(() => undefined).then(operation);
	transcriptQueues.set(normalized, next);
	try {
		return await next;
	} finally {
		if (transcriptQueues.get(normalized) === next) {
			transcriptQueues.delete(normalized);
		}
	}
}

export async function resolveOpenClawTranscriptPath(sessionKeyRaw: string): Promise<string | null> {
	const sessionKey = resolveSessionKey(sessionKeyRaw);
	const indexPath = join(openClawStateDir(), ...OPENCLAW_SESSIONS_DIR_SEGMENTS, OPENCLAW_SESSIONS_INDEX_FILE);
	try {
		const raw = await readFile(indexPath, 'utf8');
		const parsed = JSON.parse(raw) as Record<string, OpenClawSessionIndexEntry>;
		const entry = parsed[sessionKey];
		if (!entry) {
			return null;
		}
		if (entry.sessionFile) {
			return entry.sessionFile;
		}
		if (entry.sessionId) {
			return join(openClawStateDir(), ...OPENCLAW_SESSIONS_DIR_SEGMENTS, `${entry.sessionId}.jsonl`);
		}
		return null;
	} catch {
		return null;
	}
}

export async function ensureSessionTranscriptPlaintext(sessionKey: string): Promise<void> {
	await runTranscriptOperation(sessionKey, async () => {
		const transcriptPath = await resolveOpenClawTranscriptPath(sessionKey);
		const contentKey = sessionContentKeyFor(sessionKey);
		if (!transcriptPath || !contentKey) {
			return;
		}
		const raw = await readFile(transcriptPath, 'utf8');
		if (!isEncryptedEnvelope(raw)) {
			return;
		}
		const plaintext = await readSecureTextFile(transcriptPath, contentKey);
		const tmpPath = `${transcriptPath}.decrypt.${process.pid}.tmp`;
		await writeFile(tmpPath, plaintext, 'utf8');
		await rename(tmpPath, transcriptPath);
	});
}

export async function encryptSessionTranscriptAtRest(sessionKey: string): Promise<void> {
	await runTranscriptOperation(sessionKey, async () => {
		const transcriptPath = await resolveOpenClawTranscriptPath(sessionKey);
		const contentKey = sessionContentKeyFor(sessionKey);
		if (!transcriptPath || !contentKey) {
			return;
		}
		const raw = await readFile(transcriptPath, 'utf8');
		if (!raw.trim() || isEncryptedEnvelope(raw)) {
			return;
		}
		await writeSecureTextFile(transcriptPath, raw, contentKey);
	});
}
