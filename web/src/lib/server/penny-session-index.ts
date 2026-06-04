import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { resolvePennyRepoRootFromEnv } from '$lib/server/penny-config.js';
import type { PennySessionView } from '$lib/types/penny-session.js';

const INDEX_RELATIVE_PATH = ['workspace', 'penny-session-index.json'] as const;
const JSON_INDENT_SPACES = 2;

function sessionIndexPath(): string {
	return join(resolvePennyRepoRootFromEnv(), ...INDEX_RELATIVE_PATH);
}

function isPennySessionView(value: unknown): value is PennySessionView {
	if (!value || typeof value !== 'object') {
		return false;
	}
	const record = value as Record<string, unknown>;
	return (
		typeof record.key === 'string' &&
		typeof record.title === 'string' &&
		record.titleStatus === 'ready' &&
		(typeof record.updatedAt === 'number' || record.updatedAt === null) &&
		typeof record.isLegacy === 'boolean'
	);
}

function sortSessions(sessions: readonly PennySessionView[]): PennySessionView[] {
	return [...sessions].sort((left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0));
}

async function writeIndex(sessions: readonly PennySessionView[]): Promise<void> {
	const indexPath = sessionIndexPath();
	const tmpPath = `${indexPath}.tmp`;
	await mkdir(dirname(indexPath), { recursive: true });
	await writeFile(tmpPath, `${JSON.stringify(sortSessions(sessions), null, JSON_INDENT_SPACES)}\n`, 'utf8');
	await rename(tmpPath, indexPath);
}

export async function readPennySessionIndex(): Promise<PennySessionView[]> {
	try {
		const raw = await readFile(sessionIndexPath(), 'utf8');
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) {
			return [];
		}
		return sortSessions(parsed.filter(isPennySessionView));
	} catch {
		return [];
	}
}

export async function replacePennySessionIndex(sessions: readonly PennySessionView[]): Promise<void> {
	await writeIndex(sessions);
}

export async function upsertPennySessionIndex(session: PennySessionView): Promise<void> {
	const existing = await readPennySessionIndex();
	await writeIndex([session, ...existing.filter((entry) => entry.key !== session.key)]);
}

export async function bumpPennySessionIndex(key: string, updatedAt = Date.now()): Promise<void> {
	const existing = await readPennySessionIndex();
	await writeIndex(existing.map((entry) => (entry.key === key ? { ...entry, updatedAt } : entry)));
}

export async function deletePennySessionIndex(key: string): Promise<void> {
	await writeIndex((await readPennySessionIndex()).filter((entry) => entry.key !== key));
}
