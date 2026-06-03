import { openChatEventSource } from '$lib/chat/client-stream.js';
import type { SsePayload } from '$lib/chat/stream-events.js';

const STREAM_RECONNECT_INITIAL_MS = 1_000;
const STREAM_RECONNECT_MAX_MS = 15_000;

type StreamHandlers = {
	onPayload: (payload: SsePayload) => void;
};

export type ChatStreamConnection = {
	close: () => void;
	ensureOpen: () => void;
	isOpen: () => boolean;
};

export function createChatStreamConnection(
	sessionKey: string,
	handlers: StreamHandlers
): ChatStreamConnection {
	let source: EventSource | null = null;
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	let reconnectDelayMs = STREAM_RECONNECT_INITIAL_MS;
	let disposed = false;

	const clearReconnectTimer = (): void => {
		if (reconnectTimer) {
			clearTimeout(reconnectTimer);
			reconnectTimer = null;
		}
	};

	const connect = (): void => {
		if (disposed) {
			return;
		}
		source?.close();
		source = openChatEventSource(sessionKey, {
			onPayload: (payload) => {
				reconnectDelayMs = STREAM_RECONNECT_INITIAL_MS;
				handlers.onPayload(payload);
			},
			onError: () => {
				if (disposed) {
					return;
				}
				source?.close();
				source = null;
				scheduleReconnect();
			}
		});
	};

	const scheduleReconnect = (): void => {
		if (disposed || reconnectTimer) {
			return;
		}
		reconnectTimer = setTimeout(() => {
			reconnectTimer = null;
			connect();
			reconnectDelayMs = Math.min(reconnectDelayMs * 2, STREAM_RECONNECT_MAX_MS);
		}, reconnectDelayMs);
	};

	connect();

	return {
		close: () => {
			disposed = true;
			clearReconnectTimer();
			source?.close();
			source = null;
		},
		ensureOpen: () => {
			if (disposed || source?.readyState === EventSource.OPEN) {
				return;
			}
			clearReconnectTimer();
			connect();
		},
		isOpen: () => source?.readyState === EventSource.OPEN
	};
}
