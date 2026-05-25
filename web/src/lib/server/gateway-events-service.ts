import { clearAllStreamingText } from '$lib/server/chat-stream-text.js';
import { getGatewayClient } from '$lib/server/gateway-client.js';

let eventBusInitialized = false;

export function ensureGatewayEventBus(options: {
	onEvent: (event: string, payload: unknown) => void;
	shouldReconnect: () => boolean;
}): void {
	if (eventBusInitialized) {
		return;
	}

	eventBusInitialized = true;
	const client = getGatewayClient();
	void client.connect();
	client.onEvent(options.onEvent);
	client.onDisconnect(() => {
		clearAllStreamingText();
		if (options.shouldReconnect()) {
			void getGatewayClient().connect();
		}
	});
}

export function resetGatewayEventBusForTests(): void {
	eventBusInitialized = false;
}
