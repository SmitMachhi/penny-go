import { randomUUID } from 'node:crypto';
import { unlink } from 'node:fs/promises';

import { fetchChatHistory } from '$lib/server/chat-service.js';
import { getGatewayClient } from '$lib/server/gateway-client.js';
import {
	buildPennySessionKey,
	engagementMemoryPath,
	isPennySessionKey,
	LEGACY_SESSION_KEY,
	MAX_SESSION_LABEL_LENGTH,
	resolveSessionKey
} from '$lib/server/session-key.js';

const SESSION_LIST_LIMIT = 50;
const PREVIEW_MAX_CHARS = 120;
const DEFAULT_SESSION_TITLE = 'New chat';
const LEGACY_SESSION_TITLE = 'Previous chat';
const MAIN_AGENT_ID = 'main';

type GatewaySessionRow = {
	key: string;
	label?: string;
	derivedTitle?: string;
	lastMessagePreview?: string;
	updatedAt: number | null;
};

type SessionsListResult = {
	sessions?: GatewaySessionRow[];
};

export type PennySessionView = {
	key: string;
	title: string;
	preview: string | null;
	updatedAt: number | null;
	isLegacy: boolean;
};

function truncatePreview(text: string): string {
	const oneLine = text.replace(/\s+/g, ' ').trim();
	if (oneLine.length <= PREVIEW_MAX_CHARS) {
		return oneLine;
	}
	return `${oneLine.slice(0, PREVIEW_MAX_CHARS - 1)}…`;
}

function resolveSessionTitle(row: GatewaySessionRow, isLegacy: boolean): string {
	if (isLegacy) {
		return LEGACY_SESSION_TITLE;
	}
	const label = row.label?.trim();
	if (label) {
		return label;
	}
	const derived = row.derivedTitle?.trim();
	if (derived) {
		return derived;
	}
	return DEFAULT_SESSION_TITLE;
}

function toPennySessionView(row: GatewaySessionRow, isLegacy = false): PennySessionView {
	const preview = row.lastMessagePreview?.trim()
		? truncatePreview(row.lastMessagePreview)
		: null;
	return {
		key: row.key,
		title: resolveSessionTitle(row, isLegacy),
		preview,
		updatedAt: row.updatedAt,
		isLegacy
	};
}

async function listGatewaySessions(): Promise<GatewaySessionRow[]> {
	const client = getGatewayClient();
	const payload = (await client.request('sessions.list', {
		agentId: MAIN_AGENT_ID,
		includeDerivedTitles: true,
		includeLastMessage: true,
		limit: SESSION_LIST_LIMIT,
		includeGlobal: false,
		includeUnknown: false
	})) as SessionsListResult;

	return payload.sessions ?? [];
}

async function legacySessionHasHistory(): Promise<boolean> {
	try {
		const history = await fetchChatHistory(LEGACY_SESSION_KEY);
		return history.messages.length > 0;
	} catch {
		return false;
	}
}

export async function listPennySessions(): Promise<PennySessionView[]> {
	const rows = await listGatewaySessions();
	const pennyRows = rows
		.filter((row) => isPennySessionKey(row.key))
		.sort((left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0))
		.map((row) => toPennySessionView(row));

	if (pennyRows.length > 0) {
		return pennyRows;
	}

	if (await legacySessionHasHistory()) {
		const legacyRow = rows.find((row) => row.key === LEGACY_SESSION_KEY);
		return [toPennySessionView(legacyRow ?? { key: LEGACY_SESSION_KEY, updatedAt: null }, true)];
	}

	return [];
}

export async function createPennySession(label?: string): Promise<PennySessionView> {
	const uuid = randomUUID();
	const key = buildPennySessionKey(uuid);
	const trimmedLabel = label?.trim().slice(0, MAX_SESSION_LABEL_LENGTH);

	const client = getGatewayClient();
	await client.request('sessions.create', {
		key,
		agentId: MAIN_AGENT_ID,
		...(trimmedLabel ? { label: trimmedLabel } : {})
	});

	return {
		key,
		title: trimmedLabel ?? DEFAULT_SESSION_TITLE,
		preview: null,
		updatedAt: Date.now(),
		isLegacy: false
	};
}

export async function renamePennySession(key: string, label: string): Promise<PennySessionView> {
	const sessionKey = resolveSessionKey(key);
	const trimmedLabel = label.trim().slice(0, MAX_SESSION_LABEL_LENGTH);
	if (!trimmedLabel) {
		throw new Error('label is required');
	}

	const client = getGatewayClient();
	await client.request('sessions.patch', { key: sessionKey, label: trimmedLabel });

	return {
		key: sessionKey,
		title: trimmedLabel,
		preview: null,
		updatedAt: Date.now(),
		isLegacy: sessionKey === LEGACY_SESSION_KEY
	};
}

export async function deletePennySession(key: string): Promise<void> {
	const sessionKey = resolveSessionKey(key);
	const client = getGatewayClient();
	await client.request('sessions.delete', { key: sessionKey, deleteTranscript: true });

	const memoryPath = engagementMemoryPath(sessionKey);
	if (memoryPath) {
		try {
			await unlink(memoryPath);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
				throw error;
			}
		}
	}
}
