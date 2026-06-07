import type { ArtifactSummary, ArtifactsResponse } from '$lib/chat/artifacts.js';
import type { ChatMessage } from '$lib/chat/messages.js';
import { apiJson } from '$lib/chat/api-client.js';

export type HistoryResponse = {
	sessionKey: string;
	sessionId?: string;
	messages: ChatMessage[];
	artifacts?: ArtifactSummary[];
};

export type SendResponse = {
	runId: string;
	sessionKey: string;
};

export function fetchHealth(): Promise<{ ok?: boolean; message?: string }> {
	return apiJson('/api/health');
}

export function fetchHistory(sessionKey: string): Promise<HistoryResponse> {
	return apiJson(`/api/sessions/${encodeURIComponent(sessionKey)}/bootstrap`);
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
