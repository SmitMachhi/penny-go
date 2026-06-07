import { clearAllStreamingText } from '$lib/server/chat-stream-text.js';
import { clearAllThinkingStreamText } from '$lib/server/chat-stream-thinking.js';
import { getGatewayRpc } from '$lib/server/gateway-rpc.js';

const BACKGROUND_RECONNECT_DELAY_MS = 1_000;

let eventBusInitialized = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

type GatewayEventBusOptions = {
	onEvent: (event: string, payload: unknown) => void;
	shouldReconnect: () => boolean;
};

function scheduleReconnect(options: GatewayEventBusOptions): void {
	if (reconnectTimer || !options.shouldReconnect()) {
		return;
	}
	reconnectTimer = setTimeout(() => {
		reconnectTimer = null;
		connectGatewayEvents(options);
	}, BACKGROUND_RECONNECT_DELAY_MS);
}

function connectGatewayEvents(options: GatewayEventBusOptions): void {
	void getGatewayRpc()
		.connect()
		.catch(() => scheduleReconnect(options));
}

export function ensureGatewayEventBus(options: GatewayEventBusOptions): void {
	if (eventBusInitialized) {
		return;
	}

	eventBusInitialized = true;
	const rpc = getGatewayRpc();
	connectGatewayEvents(options);
	rpc.onEvent(options.onEvent);
	rpc.onDisconnect(() => {
		clearAllStreamingText();
		clearAllThinkingStreamText();
		scheduleReconnect(options);
	});
}

export function resetGatewayEventBusForTests(): void {
	eventBusInitialized = false;
	if (reconnectTimer) {
		clearTimeout(reconnectTimer);
		reconnectTimer = null;
	}
}
