import { json } from '@sveltejs/kit';

import type { SsePayload } from '$lib/chat/stream-events.js';
import { subscribeToStream } from '$lib/server/chat-service.js';
import { resolveSessionKey, sessionKeyErrorStatus } from '$lib/server/session-key.js';

function encodeSse(payload: SsePayload): string {
	return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function GET({ url }) {
	let sessionKey: string;
	try {
		sessionKey = resolveSessionKey(url.searchParams.get('sessionKey'));
	} catch (error) {
		const message = error instanceof Error ? error.message : 'invalid sessionKey';
		return json({ error: message }, { status: sessionKeyErrorStatus(error) });
	}

	let cleanup: (() => void) | null = null;

	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			const encoder = new TextEncoder();
			const send = (payload: SsePayload) => {
				controller.enqueue(encoder.encode(encodeSse(payload)));
			};

			const unsubscribe = subscribeToStream(sessionKey, send);
			const heartbeat = setInterval(() => {
				controller.enqueue(encoder.encode(': heartbeat\n\n'));
			}, 15_000);

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
