import { GatewayClient } from '$lib/gateway/client.js';
import { getGatewayConfig } from '$lib/server/gateway-env.js';
import { clearAllStreamingText } from '$lib/server/chat-stream-text.js';

let sharedClient: GatewayClient | null = null;
let disconnectHookRegistered = false;

export function getGatewayClient(): GatewayClient {
	if (!sharedClient) {
		sharedClient = new GatewayClient(getGatewayConfig());
	}
	if (!disconnectHookRegistered) {
		sharedClient.onDisconnect(clearAllStreamingText);
		disconnectHookRegistered = true;
	}
	return sharedClient;
}

export function resetGatewayClientForTests(): void {
	sharedClient = null;
	disconnectHookRegistered = false;
}
