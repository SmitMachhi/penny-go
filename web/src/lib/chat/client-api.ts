import type { ArtifactSummary, ArtifactsResponse } from '$lib/chat/artifacts.js';
import type { RunTraceState } from '$lib/chat/client-run-trace.js';
import type { ChatMessage, ToolActivity } from '$lib/chat/messages.js';
import { apiJson } from '$lib/chat/api-client.js';

const MINUTE_MS = 60_000;
const BOOTSTRAP_FETCH_TIMEOUT_MS = 2 * MINUTE_MS;

export type ActiveRunProgress = {
	tools: ToolActivity[];
	runTrace: RunTraceState;
	streamingAnswerText: string;
	inProgressMessages: ChatMessage[];
};

export type HistoryResponse = {
	sessionKey: string;
	sessionId?: string;
	messages: ChatMessage[];
	artifacts?: ArtifactSummary[];
	activeTurn?: ActiveTurn | null;
	activeRunProgress?: ActiveRunProgress | null;
};

export type SendResponse = {
	runId: string;
	sessionKey: string;
};

export type ActiveTurn = {
	turnId: string;
	runId: string | null;
	status: 'pending' | 'submitted' | 'running';
	message: string;
};

export function fetchHealth(): Promise<{ ok?: boolean; message?: string }> {
	return apiJson('/api/health');
}

export function fetchHistory(sessionKey: string): Promise<HistoryResponse> {
	return apiJson(`/api/sessions/${encodeURIComponent(sessionKey)}/bootstrap`, undefined, {
		timeoutMs: BOOTSTRAP_FETCH_TIMEOUT_MS
	});
}

export function fetchArtifacts(sessionKey: string): Promise<ArtifactsResponse> {
	return apiJson(`/api/artifacts?sessionKey=${encodeURIComponent(sessionKey)}`);
}

export function sendChatMessage(input: {
	message: string;
	sessionKey: string;
	sessionId: string | null;
	turnId: string;
}): Promise<SendResponse> {
	return apiJson('/api/chat/send', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input)
	});
}

export function abortChatRun(input: { sessionKey: string; runId: string }): Promise<unknown> {
	return apiJson('/api/chat/abort', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input)
	});
}
