<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Send } from '@lucide/svelte';

	import { getPennyContext } from '$lib/chat/penny-context.js';
	import { chatPathFromSessionKey } from '$lib/chat/session-routes.js';
	import Button from '$lib/components/ui/button.svelte';
	import Textarea from '$lib/components/ui/textarea.svelte';

	const { chat, sessions } = getPennyContext();
	let draft = $state('');
	let starting = $state(false);

	onMount(() => {
		void chat.clearSession();
	});

	async function handleSend() {
		const message = draft.trim();
		if (!message || starting || !chat.state.connected) {
			return;
		}

		starting = true;
		draft = '';

		try {
			const created = await sessions.createSession();
			if (!created) {
				draft = message;
				return;
			}

			const path = chatPathFromSessionKey(created.key);
			if (!path) {
				draft = message;
				return;
			}

			await chat.switchSession(created.key);
			await goto(path);
			await chat.sendMessage(message, { skipHistoryReload: true });
			if (chat.state.error) {
				draft = message;
			}
		} finally {
			starting = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			void handleSend();
		}
	}
</script>

<main class="flex flex-1 flex-col items-center justify-center px-4 py-10">
	<div class="w-full max-w-2xl space-y-8 text-center">
		<div class="space-y-2">
			<h2 class="text-3xl font-semibold tracking-tight">Where should we begin?</h2>
			<p class="text-sm text-muted-foreground">
				Ask about grants, tax credits, or wage subsidies for a Canadian business. Each chat stays
				isolated — facts won't mix across engagements.
			</p>
		</div>

		<form
			class="mx-auto flex w-full flex-col gap-3 rounded-2xl border border-border bg-card/60 p-4 text-left shadow-sm"
			onsubmit={(event) => {
				event.preventDefault();
				void handleSend();
			}}
		>
			<Textarea
				bind:value={draft}
				placeholder="Describe your business, jurisdiction, project, and timeline…"
				disabled={starting || !chat.state.connected}
				onkeydown={handleKeydown}
			/>
			<div class="flex items-center justify-between gap-3">
				<p class="text-xs text-muted-foreground">Enter to send · Shift+Enter for newline</p>
				<Button type="submit" disabled={starting || !chat.state.connected || !draft.trim()}>
					<Send class="h-4 w-4" />
					Send
				</Button>
			</div>
		</form>
	</div>
</main>
