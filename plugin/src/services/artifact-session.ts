import { createHash } from 'node:crypto';

import { parsePennySessionUuid } from '@penny/shared/session-key';

const LOCAL_PENNY_SESSION_PREFIX = 'penny-';
const AGENT_SCOPED_SESSION_HEAD = 'agent';
const EXPLICIT_SESSION_SEGMENT = 'explicit';
const SESSION_KEY_SEPARATOR = ':';
const AGENT_SESSION_KEY_MIN_PARTS = 3;
const AGENT_SESSION_REST_START_INDEX = 2;
const EXPLICIT_SESSION_REST_START_INDEX = 1;
const HASH_ALGORITHM = 'sha256';
const HASH_ENCODING = 'hex';
const HEX_RADIX = 16;
const UUID_PART_ONE_END = 8;
const UUID_PART_TWO_END = 12;
const UUID_PART_THREE_SUFFIX_START = 13;
const UUID_PART_THREE_END = 16;
const UUID_PART_FOUR_VARIANT_START = 16;
const UUID_PART_FOUR_SUFFIX_START = 17;
const UUID_PART_FOUR_END = 20;
const UUID_PART_FIVE_END = 32;
const UUID_VERSION_NIBBLE = '4';
const UUID_VARIANT_CLEAR_MASK = 0x3;
const UUID_VARIANT_SET_MASK = 0x8;

export function resolveArtifactSessionUuid(sessionKey: string | undefined): string | null {
	const webSessionUuid = parsePennySessionUuid(sessionKey ?? '');
	if (webSessionUuid) {
		return webSessionUuid;
	}
	return sessionKey ? localSessionUuid(sessionKey) : null;
}

function localSessionUuid(sessionKey: string): string | null {
	const candidate = localSessionCandidate(sessionKey);
	if (!candidate.startsWith(LOCAL_PENNY_SESSION_PREFIX)) {
		return null;
	}

	const hash = createHash(HASH_ALGORITHM).update(candidate).digest(HASH_ENCODING);
	const variantNibble =
		(Number.parseInt(
			hash.slice(UUID_PART_FOUR_VARIANT_START, UUID_PART_FOUR_SUFFIX_START),
			HEX_RADIX
		) &
			UUID_VARIANT_CLEAR_MASK) |
		UUID_VARIANT_SET_MASK;

	return [
		hash.slice(0, UUID_PART_ONE_END),
		hash.slice(UUID_PART_ONE_END, UUID_PART_TWO_END),
		`${UUID_VERSION_NIBBLE}${hash.slice(UUID_PART_THREE_SUFFIX_START, UUID_PART_THREE_END)}`,
		`${variantNibble.toString(HEX_RADIX)}${hash.slice(
			UUID_PART_FOUR_SUFFIX_START,
			UUID_PART_FOUR_END
		)}`,
		hash.slice(UUID_PART_FOUR_END, UUID_PART_FIVE_END)
	].join('-');
}

function localSessionCandidate(sessionKey: string): string {
	const trimmed = sessionKey.trim();
	const parts = trimmed.split(SESSION_KEY_SEPARATOR).filter((part) => part.length > 0);
	if (
		parts.length >= AGENT_SESSION_KEY_MIN_PARTS &&
		parts[0]?.toLowerCase() === AGENT_SCOPED_SESSION_HEAD
	) {
		return normalizeExplicitSessionCandidate(
			parts.slice(AGENT_SESSION_REST_START_INDEX).join(SESSION_KEY_SEPARATOR)
		);
	}
	return normalizeExplicitSessionCandidate(trimmed);
}

function normalizeExplicitSessionCandidate(candidate: string): string {
	const parts = candidate.split(SESSION_KEY_SEPARATOR);
	if (parts[0]?.toLowerCase() !== EXPLICIT_SESSION_SEGMENT) {
		return candidate;
	}
	return parts.slice(EXPLICIT_SESSION_REST_START_INDEX).join(SESSION_KEY_SEPARATOR);
}
