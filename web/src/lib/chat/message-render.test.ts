import { describe, expect, it, vi } from 'vitest';

import { renderAssistantMessageContent } from './message-render.js';

describe('renderAssistantMessageContent', () => {
	it('does not render markdown while a message is streaming', () => {
		const renderMarkdown = vi.fn(() => '<p>ignored</p>');

		const rendered = renderAssistantMessageContent({
			text: '**streaming**',
			streaming: true,
			renderMarkdown
		});

		expect(rendered).toEqual({ kind: 'text', text: '**streaming**' });
		expect(renderMarkdown).not.toHaveBeenCalled();
	});

	it('renders markdown once when a message is final', () => {
		const renderMarkdown = vi.fn(() => '<p><strong>done</strong></p>');

		const rendered = renderAssistantMessageContent({
			text: '**done**',
			streaming: false,
			renderMarkdown
		});

		expect(rendered).toEqual({ kind: 'html', html: '<p><strong>done</strong></p>' });
		expect(renderMarkdown).toHaveBeenCalledOnce();
		expect(renderMarkdown).toHaveBeenCalledWith('**done**');
	});
});
