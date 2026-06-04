import { PENNY_GATEWAY_OPERATOR_SCOPES } from './penny-gateway-rpc-manifest.js';
import { GATEWAY_PROTOCOL_VERSION } from './types.js';

const CLIENT_VERSION = 'penny-web/0.1.0';

/** OpenClaw `GATEWAY_CLIENT_CAPS.TOOL_EVENTS` — required for live `agent` tool SSE. */
export const PENNY_GATEWAY_TOOL_EVENTS_CAP = 'tool-events' as const;

export function buildConnectParams(token: string) {
	return {
		minProtocol: GATEWAY_PROTOCOL_VERSION,
		maxProtocol: GATEWAY_PROTOCOL_VERSION,
		client: {
			id: 'gateway-client',
			version: CLIENT_VERSION,
			platform: 'node',
			mode: 'backend'
		},
		role: 'operator',
		scopes: [...PENNY_GATEWAY_OPERATOR_SCOPES],
		caps: [PENNY_GATEWAY_TOOL_EVENTS_CAP],
		commands: [],
		permissions: {},
		auth: { token },
		locale: 'en-US',
		userAgent: CLIENT_VERSION
	};
}
