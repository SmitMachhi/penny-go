import { GATEWAY_PROTOCOL_VERSION, type GatewayFrame } from './types.js';

export type PendingRequest = {
	resolve: (value: unknown) => void;
	reject: (error: Error) => void;
	timer: NodeJS.Timeout;
};

export const CLIENT_VERSION = 'penny-web/0.1.0';

export function parseGatewayFrame(raw: string): GatewayFrame | null {
	try {
		return JSON.parse(raw) as GatewayFrame;
	} catch {
		return null;
	}
}

export function buildGatewayConnectParams(token: string) {
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
		scopes: ['operator.read', 'operator.write'],
		caps: [],
		commands: [],
		permissions: {},
		auth: { token },
		locale: 'en-US',
		userAgent: CLIENT_VERSION
	};
}
