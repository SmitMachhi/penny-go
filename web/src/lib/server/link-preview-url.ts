import { isIP } from 'node:net';

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
const THIS_NETWORK_FIRST_OCTET = 0;
const RFC1918_CLASS_A_OCTET = 10;
const RFC1918_CLASS_B_FIRST_OCTET = 172;
const RFC1918_CLASS_B_SECOND_OCTET_MIN = 16;
const RFC1918_CLASS_B_SECOND_OCTET_MAX = 31;
const RFC1918_CLASS_C_FIRST_OCTET = 192;
const RFC1918_CLASS_C_SECOND_OCTET = 168;
const IETF_PROTOCOL_FIRST_OCTET = 192;
const IETF_PROTOCOL_SECOND_OCTET = 0;
const IETF_PROTOCOL_THIRD_OCTET = 0;
const DOCUMENTATION_192_FIRST_OCTET = 192;
const DOCUMENTATION_192_SECOND_OCTET = 0;
const DOCUMENTATION_192_THIRD_OCTET = 2;
const SIX_TO_FOUR_ANYCAST_FIRST_OCTET = 192;
const SIX_TO_FOUR_ANYCAST_SECOND_OCTET = 88;
const SIX_TO_FOUR_ANYCAST_THIRD_OCTET = 99;
const CGNAT_FIRST_OCTET = 100;
const CGNAT_SECOND_OCTET_MIN = 64;
const CGNAT_SECOND_OCTET_MAX = 127;
const LINK_LOCAL_FIRST_OCTET = 169;
const LINK_LOCAL_SECOND_OCTET = 254;
const MULTICAST_FIRST_OCTET = 224;
const LOOPBACK_FIRST_OCTET = 127;
const BENCHMARK_FIRST_OCTET = 198;
const BENCHMARK_SECOND_OCTET_MIN = 18;
const BENCHMARK_SECOND_OCTET_MAX = 19;
const DOCUMENTATION_198_FIRST_OCTET = 198;
const DOCUMENTATION_198_SECOND_OCTET = 51;
const DOCUMENTATION_198_THIRD_OCTET = 100;
const DOCUMENTATION_203_FIRST_OCTET = 203;
const DOCUMENTATION_203_SECOND_OCTET = 0;
const DOCUMENTATION_203_THIRD_OCTET = 113;
const HEX_RADIX = 16;
const IPV6_UNIQUE_LOCAL_MASK = 0xfe00;
const IPV6_UNIQUE_LOCAL_PREFIX = 0xfc00;
const IPV6_LINK_LOCAL_MASK = 0xffc0;
const IPV6_LINK_LOCAL_PREFIX = 0xfe80;
const IPV6_MULTICAST_MASK = 0xff00;
const IPV6_MULTICAST_PREFIX = 0xff00;
const IPV6_DOCUMENTATION_FIRST_SEGMENT = 0x2001;
const IPV6_DOCUMENTATION_SECOND_SEGMENT = 0x0db8;
const IPV4_MAPPED_IPV6_PREFIX = '::ffff:';
const IPV4_COMPATIBLE_IPV6_PREFIX = '::';
const IPV4_OCTET_SHIFT_BITS = 8;
const IPV4_OCTET_MASK = 0xff;
const IPV4_MAPPED_SEGMENT_COUNT = 2;
const IPV4_MAPPED_SEGMENT_MAX = 0xffff;

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

export function isBlockedPreviewHostname(hostname: string): boolean {
	if (
		hostname === LOCALHOST_HOST ||
		hostname === LOOPBACK_IPV4 ||
		hostname === UNSPECIFIED_IPV4 ||
		hostname === LOOPBACK_IPV6_BARE ||
		hostname === LOOPBACK_IPV6 ||
		hostname.endsWith('.localhost') ||
		hostname.endsWith('.local')
	) {
		return true;
	}

	if (isBlockedIpv4(hostname)) {
		return true;
	}

	return hostname.includes(':') && isBlockedIpv6(hostname);
}

function assertPublicHostname(hostname: string): void {
	if (isBlockedPreviewHostname(hostname)) {
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
	return (
		a === THIS_NETWORK_FIRST_OCTET ||
		a === LOOPBACK_FIRST_OCTET ||
		a >= MULTICAST_FIRST_OCTET ||
		isRfc1918Ipv4(a, b) ||
		isCgnatIpv4(a, b) ||
		isLinkLocalIpv4(a, b) ||
		isDocumentationOrReservedIpv4(octets)
	);
}

function isBlockedIpv6(hostname: string): boolean {
	const normalized = stripIpv6Brackets(hostname);
	if (isIP(normalized) !== 6) {
		return true;
	}
	if (normalized === '::' || normalized === LOOPBACK_IPV6_BARE) {
		return true;
	}
	const embeddedIpv4 = readEmbeddedIpv4(normalized);
	if (embeddedIpv4 && isBlockedIpv4(embeddedIpv4)) {
		return true;
	}
	const hexMappedIpv4 = readHexMappedIpv4(normalized);
	if (hexMappedIpv4 && isBlockedIpv4(hexMappedIpv4)) {
		return true;
	}
	const [first, second] = readIpv6LeadingSegments(normalized);
	return (
		(first & IPV6_UNIQUE_LOCAL_MASK) === IPV6_UNIQUE_LOCAL_PREFIX ||
		(first & IPV6_LINK_LOCAL_MASK) === IPV6_LINK_LOCAL_PREFIX ||
		(first & IPV6_MULTICAST_MASK) === IPV6_MULTICAST_PREFIX ||
		(first === IPV6_DOCUMENTATION_FIRST_SEGMENT &&
			second === IPV6_DOCUMENTATION_SECOND_SEGMENT)
	);
}

function stripIpv6Brackets(hostname: string): string {
	return hostname.startsWith('[') && hostname.endsWith(']')
		? hostname.slice(1, -1).toLowerCase()
		: hostname.toLowerCase();
}

function readEmbeddedIpv4(hostname: string): string | null {
	const match = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(hostname);
	return match?.[1] ?? null;
}

function readHexMappedIpv4(hostname: string): string | null {
	const mappedTail = hostname.startsWith(IPV4_MAPPED_IPV6_PREFIX)
		? hostname.slice(IPV4_MAPPED_IPV6_PREFIX.length)
		: null;
	const compatibleTail =
		!mappedTail && hostname.startsWith(IPV4_COMPATIBLE_IPV6_PREFIX)
			? hostname.slice(IPV4_COMPATIBLE_IPV6_PREFIX.length)
			: null;
	const tail = mappedTail ?? compatibleTail;
	if (!tail || tail.includes('.')) {
		return null;
	}
	const segments = tail.split(':');
	if (segments.length !== IPV4_MAPPED_SEGMENT_COUNT) {
		return null;
	}
	const high = Number.parseInt(segments[0] ?? '', HEX_RADIX);
	const low = Number.parseInt(segments[1] ?? '', HEX_RADIX);
	if (!isIpv4MappedSegment(high) || !isIpv4MappedSegment(low)) {
		return null;
	}
	return [
		(high >> IPV4_OCTET_SHIFT_BITS) & IPV4_OCTET_MASK,
		high & IPV4_OCTET_MASK,
		(low >> IPV4_OCTET_SHIFT_BITS) & IPV4_OCTET_MASK,
		low & IPV4_OCTET_MASK
	].join('.');
}

function isIpv4MappedSegment(value: number): boolean {
	return !Number.isNaN(value) && value >= 0 && value <= IPV4_MAPPED_SEGMENT_MAX;
}

function readIpv6LeadingSegments(hostname: string): [number, number] {
	const segments = hostname.split(':');
	const first = Number.parseInt(segments[0] || '0', HEX_RADIX);
	const second = Number.parseInt(segments[1] || '0', HEX_RADIX);
	return [Number.isNaN(first) ? 0 : first, Number.isNaN(second) ? 0 : second];
}

function isRfc1918Ipv4(a: number, b: number): boolean {
	return (
		a === RFC1918_CLASS_A_OCTET ||
		(a === RFC1918_CLASS_B_FIRST_OCTET &&
			b >= RFC1918_CLASS_B_SECOND_OCTET_MIN &&
			b <= RFC1918_CLASS_B_SECOND_OCTET_MAX) ||
		(a === RFC1918_CLASS_C_FIRST_OCTET && b === RFC1918_CLASS_C_SECOND_OCTET)
	);
}

function isCgnatIpv4(a: number, b: number): boolean {
	return a === CGNAT_FIRST_OCTET && b >= CGNAT_SECOND_OCTET_MIN && b <= CGNAT_SECOND_OCTET_MAX;
}

function isLinkLocalIpv4(a: number, b: number): boolean {
	return a === LINK_LOCAL_FIRST_OCTET && b === LINK_LOCAL_SECOND_OCTET;
}

function isDocumentationOrReservedIpv4(octets: number[]): boolean {
	const [a, b, c] = octets;
	if (
		a === IETF_PROTOCOL_FIRST_OCTET &&
		b === IETF_PROTOCOL_SECOND_OCTET &&
		c === IETF_PROTOCOL_THIRD_OCTET
	) {
		return true;
	}
	if (
		a === DOCUMENTATION_192_FIRST_OCTET &&
		b === DOCUMENTATION_192_SECOND_OCTET &&
		c === DOCUMENTATION_192_THIRD_OCTET
	) {
		return true;
	}
	if (
		a === SIX_TO_FOUR_ANYCAST_FIRST_OCTET &&
		b === SIX_TO_FOUR_ANYCAST_SECOND_OCTET &&
		c === SIX_TO_FOUR_ANYCAST_THIRD_OCTET
	) {
		return true;
	}
	if (
		a === BENCHMARK_FIRST_OCTET &&
		b >= BENCHMARK_SECOND_OCTET_MIN &&
		b <= BENCHMARK_SECOND_OCTET_MAX
	) {
		return true;
	}
	if (
		a === DOCUMENTATION_198_FIRST_OCTET &&
		b === DOCUMENTATION_198_SECOND_OCTET &&
		c === DOCUMENTATION_198_THIRD_OCTET
	) {
		return true;
	}
	return (
		a === DOCUMENTATION_203_FIRST_OCTET &&
		b === DOCUMENTATION_203_SECOND_OCTET &&
		c === DOCUMENTATION_203_THIRD_OCTET
	);
}
