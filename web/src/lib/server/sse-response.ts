import type { SsePayload } from '$lib/chat/stream-events.js';

const DEFAULT_HEARTBEAT_MS = 15_000;

function encodeSsePayload(payload: SsePayload): string {
	return `data: ${JSON.stringify(payload)}\n\n`;
}

export function createSseResponse(
	subscribe: (send: (payload: SsePayload) => void) => () => void,
	options?: { heartbeatMs?: number }
): Response {
	const heartbeatMs = options?.heartbeatMs ?? DEFAULT_HEARTBEAT_MS;
	let cleanup: (() => void) | null = null;

	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			const encoder = new TextEncoder();
			const send = (payload: SsePayload) => {
				try {
					controller.enqueue(encoder.encode(encodeSsePayload(payload)));
				} catch {
					cleanup?.();
				}
			};

			const unsubscribe = subscribe(send);
			const heartbeat = setInterval(() => {
				try {
					controller.enqueue(encoder.encode(': heartbeat\n\n'));
				} catch {
					cleanup?.();
				}
			}, heartbeatMs);

			cleanup = () => {
				clearInterval(heartbeat);
				unsubscribe();
			};
		},
		cancel() {
			cleanup?.();
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
}
