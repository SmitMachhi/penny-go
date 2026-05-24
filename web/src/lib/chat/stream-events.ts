export type SsePayload =
	| { type: 'chat.delta'; runId: string; text: string }
	| { type: 'chat.final'; runId: string; text: string }
	| { type: 'chat.error'; runId: string; message: string }
	| { type: 'chat.aborted'; runId: string }
	| { type: 'tool.start'; runId: string; name: string }
	| { type: 'tool.done'; runId: string; name: string }
	| { type: 'connected' };
