export type { ArtifactSummary } from '$lib/chat/artifacts.js';

import type { ArtifactSummary } from '$lib/chat/artifacts.js';

export type SsePayload =
	| { type: 'chat.delta'; runId: string; text: string; replace?: boolean }
	| { type: 'chat.final'; runId: string; text: string }
	| { type: 'chat.error'; runId: string; message: string }
	| { type: 'chat.aborted'; runId: string }
	| { type: 'tool.start'; runId: string; name: string }
	| { type: 'tool.done'; runId: string; name: string }
	| { type: 'artifact.create'; runId: string; artifact: ArtifactSummary }
	| { type: 'artifact.update'; runId: string; artifact: ArtifactSummary }
	| { type: 'connected' };
