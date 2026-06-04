import { ValidationError } from '$lib/server/api-error.js';
import {
	clearLinkPreviewCacheForTests,
	fetchLinkPreview,
	setLinkPreviewTransportForTests
} from '$lib/server/link-preview.js';
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
type PreviewTransport = (
	url: URL,
	address: string,
	signal: AbortSignal
) => Promise<{ status: number; headers: Headers; body: Uint8Array }>;

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
		setLinkPreviewTransportForTests(null);
	});

	it('rejects redirects to blocked hosts', async () => {
		const transportMock = vi.fn<PreviewTransport>(
			async () =>
				Promise.resolve({
					status: REDIRECT_STATUS,
					headers: new Headers({ location: 'http://127.0.0.1/private' }),
					body: new Uint8Array()
				})
		);
		setLinkPreviewTransportForTests(transportMock);

		await expect(fetchLinkPreview('https://example.ca/start')).rejects.toThrow(ValidationError);
		expect(transportMock).toHaveBeenCalledOnce();
		expect(transportMock).toHaveBeenCalledWith(
			new URL('https://example.ca/start'),
			PUBLIC_TEST_ADDRESS,
			expect.any(AbortSignal)
		);
	});

	it('rejects hostnames that resolve to blocked addresses', async () => {
		const transportMock = vi.fn<PreviewTransport>(
			async () =>
				Promise.resolve({
					status: 200,
					headers: new Headers(HTML_HEADERS),
					body: new TextEncoder().encode('<html><head><title>Private page</title></head></html>')
				})
		);
		dnsLookupMock.mockResolvedValueOnce([{ address: LOOPBACK_TEST_ADDRESS, family: 4 }]);
		setLinkPreviewTransportForTests(transportMock);

		await expect(fetchLinkPreview('https://example.ca/start')).rejects.toThrow(ValidationError);
		expect(transportMock).not.toHaveBeenCalled();
	});

	it('follows validated public redirects', async () => {
		const transportMock = vi.fn<PreviewTransport>(
			async (url) => {
				if (inputToUrl(url) === 'https://example.ca/start') {
					return Promise.resolve({
						status: REDIRECT_STATUS,
						headers: new Headers({ location: '/final' }),
						body: new Uint8Array()
					});
				}
				return Promise.resolve({
					status: 200,
					headers: new Headers(HTML_HEADERS),
					body: new TextEncoder().encode('<html><head><title>Final page</title></head></html>')
				});
			}
		);
		setLinkPreviewTransportForTests(transportMock);

		const preview = await fetchLinkPreview('https://example.ca/start');

		expect(preview.title).toBe('Final page');
		expect(transportMock).toHaveBeenCalledTimes(2);
		expect(transportMock).toHaveBeenLastCalledWith(
			new URL('https://example.ca/final'),
			PUBLIC_TEST_ADDRESS,
			expect.any(AbortSignal)
		);
	});
});
