import type { ArtifactSummary } from '$lib/chat/artifacts.js';
import type { RunTraceState } from '$lib/chat/client-run-trace.js';
import { createEmptyRunTrace } from '$lib/chat/client-run-trace.js';
import type { ChatMessage, ToolActivity } from '$lib/chat/messages.js';

export type ChatClientState = {
	connected: boolean;
	healthChecked: boolean;
	loading: boolean;
	sending: boolean;
	sessionKey: string;
	sessionId: string | null;
	messages: ChatMessage[];
	runTrace: RunTraceState;
	/** Cumulative assistant reply while the run is in flight (from chat.delta). */
	streamingAnswerText: string;
	runTraceExpanded: boolean;
	tools: ToolActivity[];
	artifacts: ArtifactSummary[];
	artifactPanelOpen: boolean;
	artifactPanelDismissed: boolean;
	activeArtifactId: string | null;
	historyRefreshing: boolean;
	connectionError: string | null;
	operationError: string | null;
};

export function createInitialChatState(): ChatClientState {
	return {
		connected: false,
		healthChecked: false,
		loading: true,
		sending: false,
		sessionKey: '',
		sessionId: null,
		messages: [],
		runTrace: createEmptyRunTrace(),
		streamingAnswerText: '',
		runTraceExpanded: false,
		tools: [],
		artifacts: [],
		artifactPanelOpen: false,
		artifactPanelDismissed: false,
		activeArtifactId: null,
		historyRefreshing: false,
		connectionError: null,
		operationError: null
	};
}

export function clearChatSessionState(state: ChatClientState): void {
	state.sessionKey = '';
	state.sessionId = null;
	state.messages = [];
	state.loading = false;
	state.operationError = null;
	resetRunState(state);
	resetArtifactState(state);
}

export function prepareSessionSwitchState(state: ChatClientState, sessionKey: string): void {
	state.sessionKey = sessionKey;
	state.sessionId = null;
	state.messages = [];
	state.operationError = null;
	resetRunState(state);
	resetArtifactState(state);
}

export function appendUserMessage(state: ChatClientState, text: string): void {
	state.messages = [...state.messages, { id: crypto.randomUUID(), role: 'user', text }];
}

export function appendAssistantMessage(
	state: ChatClientState,
	text: string,
	artifactIds: readonly string[],
	options?: { thinkingTrace?: string }
): void {
	if (!text.trim()) {
		return;
	}
	state.messages = [
		...state.messages,
		{
			id: crypto.randomUUID(),
			role: 'assistant',
			text,
			...(options?.thinkingTrace ? { thinkingTrace: options.thinkingTrace } : {}),
			...(artifactIds.length > 0 ? { artifactIds: [...artifactIds] } : {})
		}
	];
}

export function resetRunState(state: ChatClientState): void {
	state.sending = false;
	state.runTrace = createEmptyRunTrace();
	state.streamingAnswerText = '';
	state.runTraceExpanded = false;
	state.tools = [];
}

export function startRunState(state: ChatClientState): void {
	state.sending = true;
	state.operationError = null;
	state.runTrace = createEmptyRunTrace();
	state.streamingAnswerText = '';
	state.runTraceExpanded = true;
	state.tools = [];
}

function resetArtifactState(state: ChatClientState): void {
	state.artifacts = [];
	state.artifactPanelOpen = false;
	state.artifactPanelDismissed = false;
	state.activeArtifactId = null;
}

export function applyCachedSessionThread(
	state: ChatClientState,
	sessionKey: string,
	cached: {
		sessionId: string | null;
		messages: ChatMessage[];
		artifacts: ArtifactSummary[];
		activeArtifactId: string | null;
		artifactPanelOpen: boolean;
		artifactPanelDismissed: boolean;
	}
): void {
	state.sessionKey = sessionKey;
	state.sessionId = cached.sessionId;
	state.messages = [...cached.messages];
	state.artifacts = [...cached.artifacts];
	state.activeArtifactId = cached.activeArtifactId;
	state.artifactPanelOpen = cached.artifactPanelOpen;
	state.artifactPanelDismissed = cached.artifactPanelDismissed;
	state.loading = false;
	state.historyRefreshing = true;
	state.operationError = null;
	resetRunState(state);
}
