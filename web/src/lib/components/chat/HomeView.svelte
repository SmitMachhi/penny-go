<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	import { getPennyContext } from '$lib/chat/penny-context.js';
	import { stashPendingFirstMessage } from '$lib/chat/pending-first-message.js';
	import { chatPathFromSessionKey } from '$lib/chat/session-routes.js';
	import {
		HOME_HEADLINE,
		HOME_SUBHEAD
	} from '$lib/chat/starter-prompts.js';
	import ChatComposer from '$lib/components/chat/ChatComposer.svelte';
	import StarterPromptChips from '$lib/components/chat/StarterPromptChips.svelte';

	const { chat, sessions } = getPennyContext();
	let draft = $state('');
	let starting = $state(false);

	const composerDisabled = $derived(!chat.state.connected);

	onMount(() => {
		void chat.clearSession();
	});

	async function beginChat(message: string): Promise<void> {
		const trimmed = message.trim();
		if (!trimmed || starting || !chat.state.connected) {
			return;
		}

		starting = true;
		draft = '';

		try {
			const created = await sessions.createSession();
			if (!created) {
				return;
			}

			const path = chatPathFromSessionKey(created.key);
			if (!path) {
				return;
			}

			stashPendingFirstMessage({ sessionKey: created.key, message: trimmed });
			await goto(path);
		} finally {
			starting = false;
		}
	}

	async function handleSend() {
		await beginChat(draft);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			void handleSend();
		}
	}
</script>

<main class="penny-canvas-surface flex flex-1 flex-col items-center justify-center py-12">
	<div class="penny-chat-column w-full space-y-8">
		<div class="space-y-2 text-center">
			<h2 class="font-display text-3xl font-semibold tracking-tight text-foreground">
				{HOME_HEADLINE}
			</h2>
			<p class="text-[0.9375rem] leading-relaxed text-muted-foreground">{HOME_SUBHEAD}</p>
		</div>

		<StarterPromptChips
			disabled={composerDisabled || starting}
			showExamples={false}
			onStart={(prompt) => void beginChat(prompt)}
		/>

		<ChatComposer
			bind:draft
			disabled={composerDisabled}
			sending={starting}
			showDisclaimer={true}
			onSubmit={() => void handleSend()}
			onKeydown={handleKeydown}
		/>
	</div>
</main>
