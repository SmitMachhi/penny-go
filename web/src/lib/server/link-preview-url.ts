import { ValidationError } from '$lib/server/api-error.js';

const HTTP_PROTOCOL = 'http:';
const HTTPS_PROTOCOL = 'https:';
const LOCALHOST_HOST = 'localhost';
const LOOPBACK_IPV4 = '127.0.0.1';
const UNSPECIFIED_IPV4 = '0.0.0.0';
const LOOPBACK_IPV6 = '[::1]';
const LOOPBACK_IPV6_BARE = '::1';

const PRIVATE_IPV4_OCTET_MIN = 0;
const PRIVATE_IPV4_OCTET_MAX = 255;
const RFC1918_CLASS_A_OCTET = 10;
const RFC1918_CLASS_B_FIRST_OCTET = 172;
const RFC1918_CLASS_B_SECOND_OCTET_MIN = 16;
const RFC1918_CLASS_B_SECOND_OCTET_MAX = 31;
const RFC1918_CLASS_C_FIRST_OCTET = 192;
const RFC1918_CLASS_C_SECOND_OCTET = 168;
const LINK_LOCAL_FIRST_OCTET = 169;
const LINK_LOCAL_SECOND_OCTET = 254;
const MULTICAST_FIRST_OCTET = 224;
const LOOPBACK_FIRST_OCTET = 127;

export function parsePreviewableUrl(raw: string): URL {
	const trimmed = raw.trim();
	if (!trimmed) {
		throw new ValidationError('url is required');
	}

	let parsed: URL;
	try {
		parsed = new URL(trimmed);
	} catch {
		throw new ValidationError('url is invalid');
	}

	if (parsed.protocol !== HTTP_PROTOCOL && parsed.protocol !== HTTPS_PROTOCOL) {
		throw new ValidationError('only http and https urls are allowed');
	}

	if (parsed.username || parsed.password) {
		throw new ValidationError('url must not include credentials');
	}

	const hostname = parsed.hostname.toLowerCase();
	assertPublicHostname(hostname);

	return parsed;
}

function assertPublicHostname(hostname: string): void {
	if (
		hostname === LOCALHOST_HOST ||
		hostname === LOOPBACK_IPV4 ||
		hostname === UNSPECIFIED_IPV4 ||
		hostname === LOOPBACK_IPV6_BARE ||
		hostname === LOOPBACK_IPV6 ||
		hostname.endsWith('.localhost') ||
		hostname.endsWith('.local')
	) {
		throw new ValidationError('url host is not allowed');
	}

	if (isBlockedIpv4(hostname)) {
		throw new ValidationError('url host is not allowed');
	}

	if (hostname.startsWith('[') && hostname.includes(':')) {
		throw new ValidationError('url host is not allowed');
	}
}

function isBlockedIpv4(hostname: string): boolean {
	const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname);
	if (!match) {
		return false;
	}

	const octets = match.slice(1, 5).map((part) => Number.parseInt(part, 10));
	if (octets.some((octet) => octet < PRIVATE_IPV4_OCTET_MIN || octet > PRIVATE_IPV4_OCTET_MAX)) {
		return true;
	}

	const [a, b] = octets;
	if (a === RFC1918_CLASS_A_OCTET) {
		return true;
	}
	if (
		a === RFC1918_CLASS_B_FIRST_OCTET &&
		b >= RFC1918_CLASS_B_SECOND_OCTET_MIN &&
		b <= RFC1918_CLASS_B_SECOND_OCTET_MAX
	) {
		return true;
	}
	if (a === RFC1918_CLASS_C_FIRST_OCTET && b === RFC1918_CLASS_C_SECOND_OCTET) {
		return true;
	}
	if (a === LINK_LOCAL_FIRST_OCTET && b === LINK_LOCAL_SECOND_OCTET) {
		return true;
	}
	if (a >= MULTICAST_FIRST_OCTET) {
		return true;
	}
	return a === LOOPBACK_FIRST_OCTET;
}
