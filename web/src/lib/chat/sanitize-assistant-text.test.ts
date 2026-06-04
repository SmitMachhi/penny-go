import { describe, expect, it } from 'vitest';

import { sanitizeAssistantDisplayText } from './sanitize-assistant-text.js';

describe('sanitizeAssistantDisplayText', () => {
	it('removes embed tags and media paths', () => {
		const input = [
			'Here is your plan.',
			'',
			'[embed ref="0b5f050d-7f44-49a0-8c31-c085a8a5faea" title="Funding Plan" height="600" /]',
			'MEDIA:/Users/me/Projects/penny-go/workspace/artifacts/session/id/brief.pdf'
		].join('\n');

		const output = sanitizeAssistantDisplayText(input);
		expect(output).not.toMatch(/\[embed/i);
		expect(output).not.toMatch(/^MEDIA:/m);
		expect(output).toContain('Here is your plan.');
	});

	it('removes artifact api links from markdown', () => {
		const output = sanitizeAssistantDisplayText(
			'[Open memo](/api/artifacts/abc/download?sessionKey=x&format=pdf) and /api/artifacts/abc?preview=pdf'
		);
		expect(output).not.toMatch(/\/api\/artifacts\//);
		expect(output).toContain('Open memo');
	});
});
