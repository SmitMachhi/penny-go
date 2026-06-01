import { describe, expect, it } from 'vitest';

import { sanitizeSessionDisplayText } from './session-display-sanitize.js';

describe('sanitizeSessionDisplayText', () => {
	it('strips sender untrusted metadata blocks', () => {
		const raw =
			'Sender (untrusted metadata):\n```json\n{"label":"ui"}\n```\n\nOntario SaaS grant';
		expect(sanitizeSessionDisplayText(raw)).toBe('Ontario SaaS grant');
	});

	it('strips leading timestamp envelopes', () => {
		const raw =
			'[Wed 2026-03-11 23:51 PDT] Sender (untrusted metadata):\n```json\n{"label":"ui"}\n```\n\nhello';
		expect(sanitizeSessionDisplayText(raw)).toBe('hello');
	});

	it('returns null when only metadata remains', () => {
		const raw = 'Sender (untrusted metadata):\n```json\n{"label":"ui"}\n```';
		expect(sanitizeSessionDisplayText(raw)).toBeNull();
	});

	it('passes through clean user text unchanged', () => {
		expect(sanitizeSessionDisplayText('MuskegPur funding brief')).toBe('MuskegPur funding brief');
	});
});
