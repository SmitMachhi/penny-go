import { rememberArtifactId, upsertArtifact } from '$lib/chat/client-artifact-state.js';
import {
	applyCommentaryDelta,
	applyThinkingDelta
} from '$lib/chat/client-run-trace.js';
import { upsertTool } from '$lib/chat/client-tools.js';
import type { SsePayload } from '$lib/chat/stream-events.js';

import type { ChatClientState } from './client-state.js';

const CREATE_FUNDING_BRIEF_TOOL = 'create_funding_brief';

type StreamEventHandlers = {
	activeRunId: string | null;
	pendingRunArtifactIds: string[];
	refreshArtifactsAfterBrief: () => Promise<void>;
	finalizeAssistantMessage: (payload: Extract<SsePayload, { type: 'chat.final' }>) => Promise<void>;
	resetRun: () => void;
	state: ChatClientState;
};

export function applyStreamEvent(payload: SsePayload, handlers: StreamEventHandlers): void {
	if (payload.type === 'connected') {
		handlers.state.connected = true;
		return;
	}
	if (handlers.activeRunId && 'runId' in payload && payload.runId !== handlers.activeRunId) {
		return;
	}

	switch (payload.type) {
		case 'chat.delta':
			applyCommentaryDelta(handlers.state.runTrace, payload.text, {
				replace: payload.replace
			});
			handlers.state.runTrace = { ...handlers.state.runTrace };
			break;
		case 'thinking.delta':
			applyThinkingDelta(handlers.state.runTrace, payload.text);
			handlers.state.runTrace = { ...handlers.state.runTrace };
			break;
		case 'tool.start':
			handlers.state.tools = upsertTool(handlers.state.tools, payload.name, 'running');
			break;
		case 'tool.done':
			handlers.state.tools = upsertTool(handlers.state.tools, payload.name, 'done');
			if (payload.name === CREATE_FUNDING_BRIEF_TOOL) {
				void handlers.refreshArtifactsAfterBrief();
			}
			break;
		case 'artifact.create':
		case 'artifact.update':
			upsertArtifact(handlers.state, payload.artifact);
			handlers.state.activeArtifactId = payload.artifact.artifactId;
			if (!handlers.state.artifactPanelDismissed) {
				handlers.state.artifactPanelOpen = true;
			}
			rememberArtifactId(handlers.pendingRunArtifactIds, payload.artifact.artifactId);
			break;
		case 'chat.final':
			void handlers.finalizeAssistantMessage(payload);
			break;
		case 'chat.aborted':
			handlers.resetRun();
			break;
		case 'chat.error':
			handlers.state.operationError = payload.message;
			handlers.resetRun();
			break;
	}
}
