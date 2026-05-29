import type { SsePayload } from '$lib/chat/stream-events.js';

type StreamHandlers = {
	onError: () => void;
	onPayload: (payload: SsePayload) => void;
};

export function openChatEventSource(sessionKey: string, handlers: StreamHandlers): EventSource {
	const source = new EventSource(`/api/chat/stream?sessionKey=${encodeURIComponent(sessionKey)}`);
	source.onmessage = (event) => {
		const payload = JSON.parse(event.data) as SsePayload;
		handlers.onPayload(payload);
	};
	source.onerror = handlers.onError;
	return source;
}
