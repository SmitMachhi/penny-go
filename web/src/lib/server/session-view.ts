import type { PennySessionView } from '$lib/types/penny-session.js';

import type { GatewaySessionRow } from '$lib/server/gateway-session-service.js';

const PREVIEW_MAX_CHARS = 120;
const DEFAULT_SESSION_TITLE = 'New chat';
export const LEGACY_SESSION_TITLE = 'Previous chat';

function truncatePreview(text: string): string {
	const oneLine = text.replace(/\s+/g, ' ').trim();
	if (oneLine.length <= PREVIEW_MAX_CHARS) {
		return oneLine;
	}
	return `${oneLine.slice(0, PREVIEW_MAX_CHARS - 1)}…`;
}

function resolveSessionTitle(row: GatewaySessionRow, isLegacy: boolean): string {
	if (isLegacy) {
		return LEGACY_SESSION_TITLE;
	}
	const label = row.label?.trim();
	if (label) {
		return label;
	}
	const derived = row.derivedTitle?.trim();
	if (derived) {
		return derived;
	}
	return DEFAULT_SESSION_TITLE;
}

export function toPennySessionView(row: GatewaySessionRow, isLegacy = false): PennySessionView {
	const preview = row.lastMessagePreview?.trim()
		? truncatePreview(row.lastMessagePreview)
		: null;
	return {
		key: row.key,
		title: resolveSessionTitle(row, isLegacy),
		preview,
		updatedAt: row.updatedAt,
		isLegacy
	};
}

export function buildCreatedSessionView(input: {
	key: string;
	label?: string;
	isLegacy?: boolean;
}): PennySessionView {
	return {
		key: input.key,
		title: input.label ?? DEFAULT_SESSION_TITLE,
		preview: null,
		updatedAt: Date.now(),
		isLegacy: input.isLegacy ?? false
	};
}
