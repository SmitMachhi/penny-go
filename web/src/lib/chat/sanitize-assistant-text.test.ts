import { describe, expect, it } from 'vitest';

import { sanitizeAssistantDisplayText } from './sanitize-assistant-text.js';

describe('sanitizeAssistantDisplayText', () => {
	it('removes embed tags and media paths', () => {
		const input = [
			'Here is your plan.',
			'',
			'[embed ref="0b5f050d-7f44-49a0-8c31-c085a8a5faea" title="Plan" height="600" /]',
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

	it('replaces actionable loan-like funding recommendations with a scope correction', () => {
		const output = sanitizeAssistantDisplayText(
			[
				'### CanNor — REGI & IDEANorth',
				'',
				'- Fit: Strong.',
				'- Important note: for-profit entities may receive repayable contributions.',
				'- Next step: Contact the regional office.'
			].join('\n')
		);

		expect(output).toContain('scope issue');
		expect(output).not.toContain('CanNor');
		expect(output).not.toContain('repayable');
	});

	it('allows explanatory ruled-out loan language without a ruled-out heading', () => {
		const output = sanitizeAssistantDisplayText(
			[
				"**ESSOR Volet 2 is primarily a loan program.**",
				'Instruments include repayable contributions (loans, interest-free loans) and loan guarantees.',
				"If you're firm on non-loan only, ESSOR Volet 2 is a weak fit.",
				'**Non-loan alternatives:** Quebec Investment and Innovation Tax Credit.'
			].join('\n')
		);

		expect(output).toContain('primarily a loan program');
		expect(output).toContain('Non-loan alternatives');
		expect(output).not.toContain('scope issue');
	});

	it('allows loan-like language inside ruled-out sections', () => {
		const output = sanitizeAssistantDisplayText(
			[
				'## Strong fits',
				'',
				'SEED Strategic Investments is worth pursuing.',
				'',
				'## Ruled out',
				'',
				'- IDEANorth is repayable for for-profits.'
			].join('\n')
		);

		expect(output).toContain('SEED Strategic Investments');
		expect(output).toContain('IDEANorth');
	});
});
