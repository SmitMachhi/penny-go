import { clearAllStreamingText } from '$lib/server/chat-stream-text.js';
import { getGatewayRpc } from '$lib/server/gateway-rpc.js';

let eventBusInitialized = false;

export function ensureGatewayEventBus(options: {
	onEvent: (event: string, payload: unknown) => void;
	shouldReconnect: () => boolean;
}): void {
	if (eventBusInitialized) {
		return;
	}

	eventBusInitialized = true;
	const rpc = getGatewayRpc();
	void rpc.connect();
	rpc.onEvent(options.onEvent);
	rpc.onDisconnect(() => {
		clearAllStreamingText();
		if (options.shouldReconnect()) {
			void getGatewayRpc().connect();
		}
	});
}

export function resetGatewayEventBusForTests(): void {
	eventBusInitialized = false;
}
