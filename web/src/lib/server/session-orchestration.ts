import { randomUUID } from 'node:crypto';

import { fetchChatHistory } from '$lib/server/gateway-chat-service.js';
import {
	createGatewaySession,
	deleteGatewaySession,
	listGatewaySessions,
	patchGatewaySession
} from '$lib/server/gateway-session-service.js';
import { deleteEngagementMemory } from '$lib/server/penny-engagement-storage.js';
import { parseOptionalSessionLabel, parseSessionLabel } from '$lib/server/session-label.js';
import {
	buildPennySessionKey,
	isPennySessionKey,
	LEGACY_SESSION_KEY,
	resolveSessionKey
} from '$lib/server/session-key.js';
import { buildCreatedSessionView, toPennySessionView } from '$lib/server/session-view.js';
import type { PennySessionView } from '$lib/types/penny-session.js';

export type { PennySessionView };

const CHAT_HISTORY_LIMIT = 200;
const CHAT_HISTORY_MAX_CHARS = 120_000;
const PENNY_MAIN_AGENT_ID = 'main';
const SESSION_LIST_LIMIT = 50;

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
		includeDerivedTitles: true,
		includeLastMessage: true,
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

	await patchGatewaySession({ key: sessionKey, label: trimmedLabel });

	return buildCreatedSessionView({
		key: sessionKey,
		label: trimmedLabel,
		isLegacy: sessionKey === LEGACY_SESSION_KEY
	});
}

export async function deletePennySession(key: string): Promise<void> {
	const sessionKey = resolveSessionKey(key);

	await deleteGatewaySession({ key: sessionKey, deleteTranscript: true });
	await deleteEngagementMemory(sessionKey);
}
