import { renderMarkdown as defaultRenderMarkdown } from '$lib/chat/markdown.js';

type RenderMarkdown = (source: string) => string;

export type AssistantMessageRender =
	| { kind: 'text'; text: string }
	| { kind: 'html'; html: string };

export function renderAssistantMessageContent(input: {
	text: string;
	streaming: boolean;
	renderMarkdown?: RenderMarkdown;
}): AssistantMessageRender {
	if (input.streaming) {
		return { kind: 'text', text: input.text };
	}
	return {
		kind: 'html',
		html: (input.renderMarkdown ?? defaultRenderMarkdown)(input.text)
	};
}
