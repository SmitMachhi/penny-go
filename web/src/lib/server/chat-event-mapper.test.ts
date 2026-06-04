import { beforeEach, describe, expect, it } from 'vitest';

import { mapChatEventToSse } from '$lib/server/chat-event-mapper.js';
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
});
