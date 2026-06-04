import { ValidationError } from '$lib/server/api-error.js';
import { clearLinkPreviewCacheForTests, fetchLinkPreview } from '$lib/server/link-preview.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const HTML_HEADERS = { 'content-type': 'text/html' };
const REDIRECT_STATUS = 302;
const PUBLIC_TEST_ADDRESS = '93.184.216.34';
const LOOPBACK_TEST_ADDRESS = '127.0.0.1';

type LookupAddress = {
	address: string;
	family: 4 | 6;
};

type DnsLookup = (
	hostname: string,
	options: { all: true; verbatim: true }
) => Promise<LookupAddress[]>;

const dnsLookupMock = vi.hoisted(() => vi.fn<DnsLookup>());

vi.mock('node:dns/promises', () => ({
	lookup: dnsLookupMock
}));

function inputToUrl(input: RequestInfo | URL): string {
	if (input instanceof URL) {
		return input.toString();
	}
	if (input instanceof Request) {
		return input.url;
	}
	return input;
}

describe('fetchLinkPreview', () => {
	beforeEach(() => {
		clearLinkPreviewCacheForTests();
		dnsLookupMock.mockReset();
		dnsLookupMock.mockResolvedValue([{ address: PUBLIC_TEST_ADDRESS, family: 4 }]);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('rejects redirects to blocked hosts', async () => {
		const fetchMock = vi.fn(
			async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
				new Response(null, {
					status: REDIRECT_STATUS,
					headers: { location: 'http://127.0.0.1/private' }
				})
		);
		vi.stubGlobal('fetch', fetchMock);

		await expect(fetchLinkPreview('https://example.ca/start')).rejects.toThrow(ValidationError);
		expect(fetchMock).toHaveBeenCalledOnce();
		expect(fetchMock).toHaveBeenCalledWith(
			new URL('https://example.ca/start'),
			expect.objectContaining({ redirect: 'manual' })
		);
	});

	it('rejects hostnames that resolve to blocked addresses', async () => {
		const fetchMock = vi.fn(
			async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
				new Response('<html><head><title>Private page</title></head></html>', {
					status: 200,
					headers: HTML_HEADERS
				})
		);
		dnsLookupMock.mockResolvedValueOnce([{ address: LOOPBACK_TEST_ADDRESS, family: 4 }]);
		vi.stubGlobal('fetch', fetchMock);

		await expect(fetchLinkPreview('https://example.ca/start')).rejects.toThrow(ValidationError);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('follows validated public redirects', async () => {
		const fetchMock = vi.fn(
			async (input: RequestInfo | URL, _init?: RequestInit): Promise<Response> => {
				if (inputToUrl(input) === 'https://example.ca/start') {
					return new Response(null, {
						status: REDIRECT_STATUS,
						headers: { location: '/final' }
					});
				}
				return new Response('<html><head><title>Final page</title></head></html>', {
					status: 200,
					headers: HTML_HEADERS
				});
			}
		);
		vi.stubGlobal('fetch', fetchMock);

		const preview = await fetchLinkPreview('https://example.ca/start');

		expect(preview.title).toBe('Final page');
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(fetchMock).toHaveBeenLastCalledWith(
			new URL('https://example.ca/final'),
			expect.objectContaining({ redirect: 'manual' })
		);
	});
});
