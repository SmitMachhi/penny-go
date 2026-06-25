import type { PennySessionOwnershipRegistry } from '$lib/server/penny-session-ownership.js';
import { readPennyTurns } from '$lib/server/penny-turn-store.js';
import {
	deletePennySession,
	type PennySessionView
} from '$lib/server/session-orchestration.js';
import {
	getChatHistory,
	getSessionArtifacts
} from '$lib/server/chat-orchestration.js';

type ChatHistoryReader = typeof getChatHistory;
type SessionArtifactsReader = typeof getSessionArtifacts;
type TurnReader = typeof readPennyTurns;
type SessionDeleter = typeof deletePennySession;

export type PrivacySessionExport = {
	artifacts: Awaited<ReturnType<SessionArtifactsReader>>['artifacts'];
	history: Awaited<ReturnType<ChatHistoryReader>>;
	session: PennySessionView;
	turns: Awaited<ReturnType<TurnReader>>;
};

export type PrivacyDataExport = {
	exportedAt: string;
	sessions: PrivacySessionExport[];
	userId: string;
};

type ExportPrivacyDataInput = {
	artifactsReader?: SessionArtifactsReader;
	historyReader?: ChatHistoryReader;
	now?: Date;
	registry: PennySessionOwnershipRegistry;
	turnReader?: TurnReader;
	userId: string;
};

type DeletePrivacyDataInput = {
	deleter?: SessionDeleter;
	now?: Date;
	registry: PennySessionOwnershipRegistry;
	userId: string;
};

export type PrivacyDeleteResult = {
	deletedAt: string;
	deletedSessionCount: number;
	deletedSessionKeys: string[];
	userId: string;
};

export async function exportPennyPrivacyData(
	input: ExportPrivacyDataInput
): Promise<PrivacyDataExport> {
	const sessions = await input.registry.listSessions();
	const historyReader = input.historyReader ?? getChatHistory;
	const artifactsReader = input.artifactsReader ?? getSessionArtifacts;
	const turnReader = input.turnReader ?? readPennyTurns;

	const exportedSessions: PrivacySessionExport[] = [];
	for (const session of sessions) {
		const [history, artifacts, turns] = await Promise.all([
			historyReader({ ownershipStore: input.registry, sessionKey: session.key }),
			artifactsReader({ ownershipStore: input.registry, sessionKey: session.key }),
			turnReader(session.key)
		]);
		exportedSessions.push({
			artifacts: artifacts.artifacts,
			history,
			session,
			turns
		});
	}

	return {
		exportedAt: (input.now ?? new Date()).toISOString(),
		sessions: exportedSessions,
		userId: input.userId
	};
}

export async function deletePennyPrivacyData(
	input: DeletePrivacyDataInput
): Promise<PrivacyDeleteResult> {
	const sessions = await input.registry.listSessions();
	const deleter = input.deleter ?? deletePennySession;
	const deletedSessionKeys: string[] = [];

	for (const session of sessions) {
		await deleter(session.key, input.registry);
		deletedSessionKeys.push(session.key);
	}

	return {
		deletedAt: (input.now ?? new Date()).toISOString(),
		deletedSessionCount: deletedSessionKeys.length,
		deletedSessionKeys,
		userId: input.userId
	};
}
