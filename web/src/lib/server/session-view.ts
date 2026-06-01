import type { PennySessionView } from '$lib/types/penny-session.js';

import type { GatewaySessionRow } from '$lib/server/gateway-session-service.js';

export const DEFAULT_SESSION_TITLE = 'New chat';
export const LEGACY_SESSION_TITLE = 'Previous chat';

function resolveSessionTitle(row: GatewaySessionRow, isLegacy: boolean): string {
	if (isLegacy) {
		return LEGACY_SESSION_TITLE;
	}
	const label = row.label?.trim();
	if (label) {
		return label;
	}
	return DEFAULT_SESSION_TITLE;
}

export function toPennySessionView(row: GatewaySessionRow, isLegacy = false): PennySessionView {
	return {
		key: row.key,
		title: resolveSessionTitle(row, isLegacy),
		titleStatus: 'ready',
		updatedAt: row.updatedAt,
		isLegacy
	};
}

export function buildCreatedSessionView(input: {
	key: string;
	label?: string;
	isLegacy?: boolean;
}): PennySessionView {
	const label = input.label?.trim();
	return {
		key: input.key,
		title: label ?? DEFAULT_SESSION_TITLE,
		titleStatus: 'ready',
		updatedAt: Date.now(),
		isLegacy: input.isLegacy ?? false
	};
}
