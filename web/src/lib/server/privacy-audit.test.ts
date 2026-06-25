import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	errorNameForAudit,
	recordPrivacyAuditEvent
} from './privacy-audit.js';

const NOW = new Date('2026-06-25T18:30:00.000Z');

describe('privacy audit events', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('writes structured privacy events without content payloads', () => {
		const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);

		recordPrivacyAuditEvent({
			action: 'privacy.export',
			now: NOW,
			sessionCount: 2,
			status: 'success',
			userId: 'user-1'
		});

		expect(info).toHaveBeenCalledOnce();
		expect(JSON.parse(String(info.mock.calls[0]?.[0]))).toEqual({
			action: 'privacy.export',
			sessionCount: 2,
			status: 'success',
			timestamp: NOW.toISOString(),
			userId: 'user-1'
		});
	});

	it('normalizes unknown audit errors', () => {
		expect(errorNameForAudit(new TypeError('bad'))).toBe('TypeError');
		expect(errorNameForAudit('bad')).toBe('UnknownError');
	});
});
