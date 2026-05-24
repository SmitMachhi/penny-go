import { GatewayClient } from '$lib/gateway/client.js';
import { getGatewayConfig } from '$lib/server/gateway-env.js';

let sharedClient: GatewayClient | null = null;

export function getGatewayClient(): GatewayClient {
	if (!sharedClient) {
		sharedClient = new GatewayClient(getGatewayConfig());
	}
	return sharedClient;
}

export function resetGatewayClientForTests(): void {
	sharedClient = null;
}
