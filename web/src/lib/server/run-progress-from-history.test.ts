import { describe, expect, it } from 'vitest';

import {
	extractActiveRunProgress,
	mergeMessagesForActiveTurn
} from './run-progress-from-history.js';

const USER_MESSAGE = 'Find grants for my factory in Laval';

describe('run progress from history', () => {
	it('extracts tools, trace, and in-progress commentary after the active user message', () => {
		const rawMessages = [
			{
				type: 'message',
				message: {
					role: 'user',
					content: [{ type: 'text', text: USER_MESSAGE }]
				}
			},
			{
				type: 'message',
				message: {
					role: 'assistant',
					content: [
						{ type: 'text', text: 'Searching the corpus.' },
						{
							type: 'toolCall',
							toolName: 'search_corpus',
							toolCallId: 'call-1'
						}
					],
					stopReason: 'toolUse'
				}
			},
			{
				type: 'message',
				message: {
					role: 'toolResult',
					toolCallId: 'call-1',
					toolName: 'search_corpus',
					content: [{ type: 'text', text: '{"matches":[]}' }]
				}
			},
			{
				type: 'message',
				message: {
					role: 'assistant',
					content: [{ type: 'text', text: 'Checking official sources next.' }],
					stopReason: 'stop'
				}
			}
		];

		const progress = extractActiveRunProgress(rawMessages, USER_MESSAGE);

		expect(progress).not.toBeNull();
		expect(progress?.tools).toEqual([
			expect.objectContaining({ name: 'search_corpus', phase: 'done' })
		]);
		expect(progress?.runTrace.liveSegment).toBe('Checking official sources next.');
		expect(progress?.streamingAnswerText).toBe('Checking official sources next.');
		expect(progress?.inProgressMessages).toEqual([
			expect.objectContaining({
				role: 'assistant',
				text: 'Searching the corpus.'
			}),
			expect.objectContaining({
				role: 'assistant',
				text: 'Checking official sources next.'
			})
		]);
	});

	it('returns null when no assistant progress exists after the active user message', () => {
		const rawMessages = [
			{
				type: 'message',
				message: {
					role: 'user',
					content: [{ type: 'text', text: USER_MESSAGE }]
				}
			}
		];

		expect(extractActiveRunProgress(rawMessages, USER_MESSAGE)).toBeNull();
	});

	it('merges in-progress assistant messages after the active user turn', () => {
		const baseMessages = [
			{ id: 'user-1', role: 'user' as const, text: USER_MESSAGE }
		];
		const progress = {
			tools: [{ id: 'tool-1', name: 'web_search', phase: 'running' as const }],
			runTrace: { segments: [], liveSegment: 'Searching the web.' },
			streamingAnswerText: 'Searching the web.',
			inProgressMessages: [
				{
					id: 'active-progress-0',
					role: 'assistant' as const,
					text: 'Searching the web.',
					phase: 'commentary' as const
				}
			]
		};

		expect(mergeMessagesForActiveTurn(baseMessages, USER_MESSAGE, progress)).toEqual([
			{ id: 'user-1', role: 'user', text: USER_MESSAGE },
			progress.inProgressMessages[0]
		]);
	});
});
