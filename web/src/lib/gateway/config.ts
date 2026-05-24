const DEFAULT_GATEWAY_URL = 'ws://127.0.0.1:18789';
const DEFAULT_SESSION_KEY = 'agent:main:main';
const DEFAULT_REQUEST_TIMEOUT_MS = 120_000;

export type GatewayConfig = {
	url: string;
	token: string;
	sessionKey: string;
	requestTimeoutMs: number;
};

export function loadGatewayConfig(env: NodeJS.ProcessEnv = process.env): GatewayConfig {
	const url = env.OPENCLAW_GATEWAY_URL?.trim() || DEFAULT_GATEWAY_URL;
	const token = env.OPENCLAW_GATEWAY_TOKEN?.trim() ?? '';
	const sessionKey = env.PENNY_SESSION_KEY?.trim() || DEFAULT_SESSION_KEY;
	const requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS;

	if (!token) {
		throw new Error(
			'OPENCLAW_GATEWAY_TOKEN is required for the Penny web UI (copy from ~/.openclaw/openclaw.json gateway.auth.token into web/.env)'
		);
	}

	return { url, token, sessionKey, requestTimeoutMs };
}
