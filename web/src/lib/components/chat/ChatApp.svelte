<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { Send, Square } from '@lucide/svelte';

	import { ChatClient } from '$lib/chat/client.svelte.js';
	import MessageBubble from '$lib/components/chat/MessageBubble.svelte';
	import ThemeToggle from '$lib/components/chat/ThemeToggle.svelte';
	import ToolStrip from '$lib/components/chat/ToolStrip.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import Textarea from '$lib/components/ui/textarea.svelte';
	import { cn } from '$lib/utils.js';

	const client = new ChatClient();
	let draft = $state('');

	onMount(() => {
		void client.bootstrap();
	});

	onDestroy(() => {
		client.dispose();
	});

	async function handleSend() {
		const message = draft;
		draft = '';
		await client.sendMessage(message);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			void handleSend();
		}
	}
</script>

<div class="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-6">
	<header class="mb-6 flex items-center justify-between gap-4">
		<div>
			<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Penny</p>
			<h1 class="text-2xl font-semibold tracking-tight">Canadian funding consultant</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				Corpus-first recommendations with live official verification.
			</p>
		</div>
		<div class="flex items-center gap-3">
			<span
				class={cn(
					'rounded-full px-2 py-1 text-xs',
					client.state.connected
						? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
						: 'bg-destructive/15 text-destructive'
				)}
			>
				{client.state.connected ? 'Gateway connected' : 'Gateway offline'}
			</span>
			<ThemeToggle />
		</div>
	</header>

	<section class="flex min-h-[60vh] flex-1 flex-col gap-4 overflow-y-auto rounded-2xl border border-border bg-card/40 p-4">
		{#if client.state.loading}
			<p class="text-sm text-muted-foreground">Loading conversation…</p>
		{:else if client.state.messages.length === 0}
			<div class="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
				Ask about grants, tax credits, or wage subsidies for your Canadian business. Penny
				searches the verified corpus first, then verifies every recommendation against live
				government pages.
			</div>
		{/if}

		{#each client.state.messages as message (message.id)}
			<MessageBubble {message} />
		{/each}

		<ToolStrip tools={client.state.tools} />

		{#if client.state.streamText}
			<MessageBubble
				message={{ id: 'stream', role: 'assistant', text: client.state.streamText }}
			/>
		{/if}
	</section>

	{#if client.state.error}
		<p class="mt-3 text-sm text-destructive">{client.state.error}</p>
	{/if}

	<form
		class="mt-4 flex flex-col gap-3"
		onsubmit={(event) => {
			event.preventDefault();
			void handleSend();
		}}
	>
		<Textarea
			bind:value={draft}
			placeholder="Describe your business, jurisdiction, project, and timeline…"
			disabled={client.state.sending || !client.state.connected}
			onkeydown={handleKeydown}
		/>
		<div class="flex items-center justify-between gap-3">
			<p class="text-xs text-muted-foreground">Enter to send · Shift+Enter for newline</p>
			<div class="flex gap-2">
				{#if client.state.sending}
					<Button variant="outline" type="button" onclick={() => void client.abortActiveRun()}>
						<Square class="h-4 w-4" />
						Stop
					</Button>
				{/if}
				<Button type="submit" disabled={client.state.sending || !client.state.connected || !draft.trim()}>
					<Send class="h-4 w-4" />
					Send
				</Button>
			</div>
		</div>
	</form>
</div>
