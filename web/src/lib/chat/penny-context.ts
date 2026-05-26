import { getContext, setContext } from 'svelte';

import type { ChatClient } from '$lib/chat/client.svelte.js';
import type { SessionClient } from '$lib/chat/sessions.svelte.js';

const PENNY_CONTEXT_KEY = Symbol('penny-context');

export type PennyContext = {
	chat: ChatClient;
	sessions: SessionClient;
};

export function setPennyContext(context: PennyContext): void {
	setContext(PENNY_CONTEXT_KEY, context);
}

export function getPennyContext(): PennyContext {
	const context = getContext<PennyContext | undefined>(PENNY_CONTEXT_KEY);
	if (!context) {
		throw new Error('Penny context is unavailable');
	}
	return context;
}
