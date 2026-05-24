import { getGatewayConfig } from '$lib/server/gateway-env.js';

export class SessionKeyError extends Error {
	constructor() {
		super('sessionKey is not allowed');
		this.name = 'SessionKeyError';
	}
}

export function resolveSessionKey(candidate: string | null | undefined): string {
	const configured = getGatewayConfig().sessionKey;
	const sessionKey = candidate?.trim() || configured;
	if (sessionKey !== configured) {
		throw new SessionKeyError();
	}
	return sessionKey;
}

export function sessionKeyErrorStatus(error: unknown): number {
	return error instanceof SessionKeyError ? 403 : 503;
}
