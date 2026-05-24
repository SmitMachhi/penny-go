import { join } from 'node:path';

import { resolveWorkspaceRoot } from '$lib/server/penny-config.js';

export const LEGACY_SESSION_KEY = 'agent:main:main';
export const PENNY_SESSION_PREFIX = 'agent:main:penny:';
export const MAX_SESSION_LABEL_LENGTH = 60;

export class SessionKeyError extends Error {
	constructor(message = 'sessionKey is not allowed') {
		super(message);
		this.name = 'SessionKeyError';
	}
}

export function isPennySessionKey(sessionKey: string): boolean {
	if (!sessionKey.startsWith(PENNY_SESSION_PREFIX)) {
		return false;
	}
	return sessionKey.slice(PENNY_SESSION_PREFIX.length).length > 0;
}

export function isAllowedSessionKey(sessionKey: string): boolean {
	return isPennySessionKey(sessionKey) || sessionKey === LEGACY_SESSION_KEY;
}

export function resolveSessionKey(candidate: string | null | undefined): string {
	const sessionKey = candidate?.trim();
	if (!sessionKey || !isAllowedSessionKey(sessionKey)) {
		throw new SessionKeyError();
	}
	return sessionKey;
}

export function parsePennySessionUuid(sessionKey: string): string | null {
	if (!isPennySessionKey(sessionKey)) {
		return null;
	}
	return sessionKey.slice(PENNY_SESSION_PREFIX.length);
}

export function buildPennySessionKey(uuid: string): string {
	return `${PENNY_SESSION_PREFIX}${uuid}`;
}

export function engagementMemoryPath(sessionKey: string, workspaceRoot = resolveWorkspaceRoot()): string | null {
	const uuid = parsePennySessionUuid(sessionKey);
	if (!uuid) {
		return null;
	}
	return join(workspaceRoot, 'memory/engagements', `${uuid}.md`);
}

export function sessionKeyErrorStatus(error: unknown): number {
	return error instanceof SessionKeyError ? 403 : 503;
}
