import { describe, expect, it } from 'vitest';

import { classifyRequestError, formatRequestError, isAbortError } from './request-error.js';

describe('classifyRequestError', () => {
	it('maps Failed to fetch to a friendly network message', () => {
		const result = classifyRequestError(new TypeError('Failed to fetch'), 'fallback');
		expect(result.kind).toBe('network');
		expect(result.message).toContain('dev server');
		expect(result.retryable).toBe(true);
	});

	it('passes through http error messages', () => {
		const result = classifyRequestError(new Error('gateway unavailable'), 'fallback');
		expect(result.kind).toBe('http');
		expect(result.message).toBe('gateway unavailable');
	});

	it('detects abort errors', () => {
		const error = new DOMException('Aborted', 'AbortError');
		expect(isAbortError(error)).toBe(true);
		expect(classifyRequestError(error, 'timed out').kind).toBe('abort');
	});

	it('extracts message from gateway json errors', () => {
		const result = classifyRequestError(
			new Error('{"code":"INVALID_REQUEST","message":"missing scope: operator.admin"}'),
			'fallback'
		);
		expect(result.message).toBe('missing scope: operator.admin');
	});

	it('uses fallback for unknown errors', () => {
		expect(formatRequestError('nope', 'failed to load sessions')).toBe('failed to load sessions');
	});
});
