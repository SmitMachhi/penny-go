import { randomUUID } from 'node:crypto';

import { uniqueSessionLabel } from '@penny/shared/session-label-unique';
import { titleFromFirstMessage } from '@penny/shared/session-title';

import {
	CHAT_HISTORY_LIMIT,
	CHAT_HISTORY_MAX_CHARS
} from '$lib/server/chat-history-config.js';
import { fetchChatHistory } from '$lib/server/gateway-chat-service.js';
import {
	createGatewaySession,
	deleteGatewaySession,
	listGatewaySessions,
	patchGatewaySession
} from '$lib/server/gateway-session-service.js';
import { deleteEngagementMemory } from '$lib/server/penny-engagement-storage.js';
import { deleteSessionArtifacts } from '$lib/server/artifact-storage.js';
import { sanitizeSessionDisplayText } from '$lib/server/session-display-sanitize.js';
import { parseOptionalSessionLabel, parseSessionLabel } from '$lib/server/session-label.js';
import {
	buildPennySessionKey,
	isPennySessionKey,
	LEGACY_SESSION_KEY,
	resolveSessionKey
} from '$lib/server/session-key.js';
import { buildCreatedSessionView, DEFAULT_SESSION_TITLE, toPennySessionView } from '$lib/server/session-view.js';
import type { PennySessionView } from '$lib/types/penny-session.js';
import { extractMessageText } from '$lib/chat/messages.js';

export type { PennySessionView };

const PENNY_MAIN_AGENT_ID = 'main';
const SESSION_LIST_LIMIT = 50;

async function listTakenSessionLabels(excludeKey: string): Promise<string[]> {
	const rows = await listGatewaySessions({
		agentId: PENNY_MAIN_AGENT_ID,
		includeDerivedTitles: false,
		includeLastMessage: false,
		limit: SESSION_LIST_LIMIT,
		includeGlobal: false,
		includeUnknown: false
	});
	return (rows ?? [])
		.filter((row) => row.key !== excludeKey)
		.map((row) => row.label?.trim())
		.filter((label): label is string => Boolean(label));
}

async function legacySessionHasHistory(): Promise<boolean> {
	try {
		const history = await fetchChatHistory({
			sessionKey: LEGACY_SESSION_KEY,
			limit: CHAT_HISTORY_LIMIT,
			maxChars: CHAT_HISTORY_MAX_CHARS
		});
		return history.messages.length > 0;
	} catch {
		return false;
	}
}

export async function listPennySessions(): Promise<PennySessionView[]> {
	const rows = await listGatewaySessions({
		agentId: PENNY_MAIN_AGENT_ID,
		includeDerivedTitles: false,
		includeLastMessage: false,
		limit: SESSION_LIST_LIMIT,
		includeGlobal: false,
		includeUnknown: false
	});
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
	const trimmedLabel = parseOptionalSessionLabel(label);

	await createGatewaySession({
		key,
		agentId: PENNY_MAIN_AGENT_ID,
		...(trimmedLabel ? { label: trimmedLabel } : {})
	});

	return buildCreatedSessionView({ key, label: trimmedLabel });
}

export async function renamePennySession(key: string, label: string): Promise<PennySessionView> {
	const sessionKey = resolveSessionKey(key);
	const trimmedLabel = parseSessionLabel(label);
	const takenLabels = await listTakenSessionLabels(sessionKey);
	const uniqueLabel = uniqueSessionLabel(trimmedLabel, takenLabels);

	await patchGatewaySession({ key: sessionKey, label: uniqueLabel });

	return buildCreatedSessionView({
		key: sessionKey,
		label: uniqueLabel,
		isLegacy: sessionKey === LEGACY_SESSION_KEY
	});
}

async function readFirstUserMessage(sessionKey: string): Promise<string | null> {
	const history = await fetchChatHistory({
		sessionKey,
		limit: CHAT_HISTORY_LIMIT,
		maxChars: CHAT_HISTORY_MAX_CHARS
	});
	for (const message of history.messages) {
		if (!message || typeof message !== 'object') {
			continue;
		}
		const record = message as Record<string, unknown>;
		if (record.role !== 'user') {
			continue;
		}
		const text = extractMessageText(message).trim();
		if (text) {
			return text;
		}
	}
	return null;
}

function titleFromHistoryMessage(message: string): string | null {
	const sanitized = sanitizeSessionDisplayText(message);
	if (!sanitized) {
		return null;
	}
	return titleFromFirstMessage(sanitized);
}

export async function generatePennySessionTitle(
	key: string,
	firstMessage?: string
): Promise<PennySessionView> {
	const sessionKey = resolveSessionKey(key);
	const rows = await listGatewaySessions({
		agentId: PENNY_MAIN_AGENT_ID,
		includeDerivedTitles: false,
		includeLastMessage: false,
		limit: SESSION_LIST_LIMIT,
		includeGlobal: false,
		includeUnknown: false
	});
	const existing = rows.find((row) => row.key === sessionKey);
	const existingLabel = existing?.label?.trim();
	if (existingLabel) {
		return toPennySessionView({
			key: sessionKey,
			label: existingLabel,
			updatedAt: existing?.updatedAt ?? null
		});
	}

	const sourceMessage = firstMessage?.trim() || (await readFirstUserMessage(sessionKey));
	if (!sourceMessage) {
		return toPennySessionView(
			existing ?? { key: sessionKey, updatedAt: Date.now() },
			false
		);
	}

	const title = titleFromHistoryMessage(sourceMessage);
	if (!title || title === DEFAULT_SESSION_TITLE) {
		return toPennySessionView(
			existing ?? { key: sessionKey, updatedAt: Date.now() },
			false
		);
	}

	return renamePennySession(sessionKey, title);
}

export async function deletePennySession(key: string): Promise<void> {
	const sessionKey = resolveSessionKey(key);

	await deleteGatewaySession({ key: sessionKey, deleteTranscript: true });
	await deleteEngagementMemory(sessionKey);
	await deleteSessionArtifacts(sessionKey);
}
