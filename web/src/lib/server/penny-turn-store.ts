import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { resolvePennyRepoRootFromEnv } from '$lib/server/penny-config.js';
import { LEGACY_SESSION_KEY, parsePennySessionUuid, resolveSessionKey } from '$lib/server/session-key.js';

export type PennyTurnStatus =
	| 'pending'
	| 'submitted'
	| 'running'
	| 'completed'
	| 'failed'
	| 'aborted';

export type PennyTurn = {
	turnId: string;
	sessionKey: string;
	message: string;
	status: PennyTurnStatus;
	runId: string | null;
	createdAt: number;
	updatedAt: number;
	error?: string;
};

type PennyTurnPatch = Partial<Pick<PennyTurn, 'status' | 'runId' | 'updatedAt' | 'error'>>;

const TURN_LEDGER_RELATIVE_DIR = ['workspace', 'penny-turns'] as const;
const JSON_INDENT_SPACES = 2;
const LEGACY_LEDGER_NAME = 'legacy';

function isPennyTurnStatus(value: unknown): value is PennyTurnStatus {
	return (
		value === 'pending' ||
		value === 'submitted' ||
		value === 'running' ||
		value === 'completed' ||
		value === 'failed' ||
		value === 'aborted'
	);
}

function isPennyTurn(value: unknown): value is PennyTurn {
	if (!value || typeof value !== 'object') {
		return false;
	}
	const record = value as Partial<PennyTurn>;
	return (
		typeof record.turnId === 'string' &&
		typeof record.sessionKey === 'string' &&
		typeof record.message === 'string' &&
		isPennyTurnStatus(record.status) &&
		(typeof record.runId === 'string' || record.runId === null) &&
		typeof record.createdAt === 'number' &&
		typeof record.updatedAt === 'number' &&
		(record.error === undefined || typeof record.error === 'string')
	);
}

function sortTurns(turns: readonly PennyTurn[]): PennyTurn[] {
	return [...turns].sort((left, right) => left.createdAt - right.createdAt);
}

function ledgerNameForSession(sessionKey: string): string {
	const uuid = parsePennySessionUuid(sessionKey);
	if (uuid) {
		return uuid;
	}
	if (sessionKey === LEGACY_SESSION_KEY) {
		return LEGACY_LEDGER_NAME;
	}
	throw new Error('unsupported turn ledger session');
}

function turnLedgerPath(sessionKeyRaw: string): string {
	const sessionKey = resolveSessionKey(sessionKeyRaw);
	return join(
		resolvePennyRepoRootFromEnv(),
		...TURN_LEDGER_RELATIVE_DIR,
		`${ledgerNameForSession(sessionKey)}.json`
	);
}

async function writeTurnLedger(sessionKey: string, turns: readonly PennyTurn[]): Promise<void> {
	const ledgerPath = turnLedgerPath(sessionKey);
	const tmpPath = `${ledgerPath}.tmp`;
	await mkdir(dirname(ledgerPath), { recursive: true });
	await writeFile(tmpPath, `${JSON.stringify(sortTurns(turns), null, JSON_INDENT_SPACES)}\n`, 'utf8');
	await rename(tmpPath, ledgerPath);
}

export async function readPennyTurns(sessionKey: string): Promise<PennyTurn[]> {
	try {
		const raw = await readFile(turnLedgerPath(sessionKey), 'utf8');
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) {
			return [];
		}
		return sortTurns(parsed.filter(isPennyTurn));
	} catch {
		return [];
	}
}

export async function readPennyTurn(
	sessionKey: string,
	turnId: string
): Promise<PennyTurn | null> {
	const turns = await readPennyTurns(sessionKey);
	return turns.find((turn) => turn.turnId === turnId) ?? null;
}

export async function upsertPennyTurn(turn: PennyTurn): Promise<PennyTurn> {
	const sessionKey = resolveSessionKey(turn.sessionKey);
	const normalized = { ...turn, sessionKey };
	const existing = await readPennyTurns(sessionKey);
	await writeTurnLedger(sessionKey, [
		normalized,
		...existing.filter((entry) => entry.turnId !== normalized.turnId)
	]);
	return normalized;
}

export async function patchPennyTurn(
	sessionKeyRaw: string,
	turnId: string,
	patch: PennyTurnPatch
): Promise<PennyTurn | null> {
	const sessionKey = resolveSessionKey(sessionKeyRaw);
	const existing = await readPennyTurns(sessionKey);
	const current = existing.find((turn) => turn.turnId === turnId);
	if (!current) {
		return null;
	}
	const patched: PennyTurn = { ...current, ...patch, sessionKey };
	await writeTurnLedger(sessionKey, [
		patched,
		...existing.filter((entry) => entry.turnId !== turnId)
	]);
	return patched;
}

export async function deletePennyTurnsForSession(sessionKey: string): Promise<void> {
	await rm(turnLedgerPath(sessionKey), { force: true });
}
