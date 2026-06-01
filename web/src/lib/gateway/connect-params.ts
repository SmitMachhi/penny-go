import { GATEWAY_PROTOCOL_VERSION } from './types.js';

const CLIENT_VERSION = 'penny-web/0.1.0';

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
		scopes: ['operator.admin', 'operator.read', 'operator.write'],
		caps: [],
		commands: [],
		permissions: {},
		auth: { token },
		locale: 'en-US',
		userAgent: CLIENT_VERSION
	};
}
