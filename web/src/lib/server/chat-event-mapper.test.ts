import { beforeEach, describe, expect, it } from 'vitest';

import { mapAgentEventToSse, mapChatEventToSse } from '$lib/server/chat-event-mapper.js';
import { resetStreamingTextForTests } from '$lib/server/chat-stream-text.js';

describe('mapChatEventToSse', () => {
	beforeEach(() => {
		resetStreamingTextForTests();
	});

	it('uses buffered delta text when final event has no message', () => {
		mapChatEventToSse({ runId: 'run-1', state: 'delta', deltaText: 'Hello' });
		mapChatEventToSse({ runId: 'run-1', state: 'delta', deltaText: ' world' });

		expect(mapChatEventToSse({ runId: 'run-1', state: 'final' })).toEqual({
			type: 'chat.final',
			runId: 'run-1',
			text: 'Hello world'
		});
	});

	it('maps tool-use assistant text to progress instead of final', () => {
		expect(
			mapChatEventToSse({
				runId: 'run-1',
				state: 'final',
				message: {
					role: 'assistant',
					stopReason: 'toolUse',
					content: [
						{ type: 'text', text: 'I now have enough verified data. Let me create the plan.' },
						{ type: 'toolCall', name: 'create_funding_brief' }
					]
				}
			})
		).toEqual({
			type: 'chat.progress',
			runId: 'run-1',
			text: 'I now have enough verified data. Let me create the plan.'
		});
	});

	it('does not emit empty progress for tool-use assistant messages with only tool calls', () => {
		expect(
			mapChatEventToSse({
				runId: 'run-1',
				state: 'final',
				message: {
					role: 'assistant',
					stopReason: 'toolUse',
					content: [{ type: 'toolCall', name: 'create_funding_brief' }]
				}
			})
		).toBeNull();
	});
});

describe('mapAgentEventToSse', () => {
	it('maps tool start and done phases', () => {
		expect(
			mapAgentEventToSse({
				runId: 'run-1',
				stream: 'tool',
				data: { tool: 'search_corpus', phase: 'start' }
			})
		).toEqual({ type: 'tool.start', runId: 'run-1', name: 'search_corpus' });

		expect(
			mapAgentEventToSse({
				runId: 'run-1',
				stream: 'tool',
				data: { tool: 'search_corpus', phase: 'done' }
			})
		).toEqual({ type: 'tool.done', runId: 'run-1', name: 'search_corpus' });
	});

	it('ignores non-tool agent streams', () => {
		expect(
			mapAgentEventToSse({
				runId: 'run-1',
				stream: 'assistant',
				data: { name: 'search_corpus' }
			})
		).toBeNull();
	});
});
