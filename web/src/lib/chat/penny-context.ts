import { getContext, setContext } from 'svelte';

import type { ChatClient } from '$lib/chat/client.svelte.js';
import type { SessionClient } from '$lib/chat/sessions.svelte.js';

/** String key avoids duplicate Symbol instances under Vite HMR. */
const PENNY_CONTEXT_KEY = 'penny-app-context';

export type PennyContext = {
	chat: ChatClient;
	sessions: SessionClient;
};

let modulePennyContext: PennyContext | null = null;

export function setPennyContext(context: PennyContext): void {
	modulePennyContext = context;
	setContext(PENNY_CONTEXT_KEY, context);
}

export function getPennyContext(): PennyContext {
	const context =
		getContext<PennyContext | undefined>(PENNY_CONTEXT_KEY) ?? modulePennyContext;
	if (!context) {
		throw new Error('Penny context is unavailable');
	}
	return context;
}

export function clearPennyContextForTests(): void {
	modulePennyContext = null;
}
