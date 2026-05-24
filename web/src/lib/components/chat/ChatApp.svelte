<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { Menu, Send, Square } from '@lucide/svelte';

	import { ChatClient } from '$lib/chat/client.svelte.js';
	import { SessionClient } from '$lib/chat/sessions.svelte.js';
	import MessageBubble from '$lib/components/chat/MessageBubble.svelte';
	import SessionSidebar from '$lib/components/chat/SessionSidebar.svelte';
	import ThemeToggle from '$lib/components/chat/ThemeToggle.svelte';
	import ToolStrip from '$lib/components/chat/ToolStrip.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import Textarea from '$lib/components/ui/textarea.svelte';
	import { cn } from '$lib/utils.js';

	const chat = new ChatClient();
	const sessions = new SessionClient();
	let draft = $state('');
	let wasSending = $state(false);

	$effect(() => {
		if (wasSending && !chat.state.sending) {
			void sessions.refresh();
		}
		wasSending = chat.state.sending;
	});

	onMount(async () => {
		await chat.bootstrap();
		if (chat.state.connected) {
			const activeKey = await sessions.bootstrap(chat);
			if (!activeKey) {
				chat.state.loading = false;
			}
		} else {
			chat.state.loading = false;
		}
	});

	onDestroy(() => {
		chat.dispose();
	});

	async function handleSend() {
		const message = draft;
		draft = '';
		await chat.sendMessage(message);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			void handleSend();
		}
	}
</script>

<div class="flex min-h-screen">
	<SessionSidebar {chat} {sessions} />

	<div class="flex min-h-screen flex-1 flex-col px-4 py-6">
		<header class="mb-6 flex items-center justify-between gap-4">
			<div class="flex items-start gap-3">
				<Button
					variant="outline"
					size="icon"
					class="md:hidden"
					onclick={() => {
						sessions.state.sidebarOpen = true;
					}}
					aria-label="Open chats"
				>
					<Menu class="h-4 w-4" />
				</Button>
				<div>
					<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Penny</p>
					<h1 class="text-2xl font-semibold tracking-tight">Canadian funding consultant</h1>
					<p class="mt-1 text-sm text-muted-foreground">
						Corpus-first recommendations with live official verification.
					</p>
				</div>
			</div>
			<div class="flex items-center gap-3">
				<span
					class={cn(
						'rounded-full px-2 py-1 text-xs',
						chat.state.connected
							? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
							: 'bg-destructive/15 text-destructive'
					)}
				>
					{chat.state.connected ? 'Gateway connected' : 'Gateway offline'}
				</span>
				<ThemeToggle />
			</div>
		</header>

		<section
			class="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-1 flex-col gap-4 overflow-y-auto rounded-2xl border border-border bg-card/40 p-4"
		>
			{#if chat.state.loading}
				<p class="text-sm text-muted-foreground">Loading conversation…</p>
			{:else if chat.state.messages.length === 0}
				<div class="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
					Ask about grants, tax credits, or wage subsidies for <strong>this</strong> Canadian
					business. Each chat is a separate engagement — facts here won't mix with your other
					businesses.
				</div>
			{/if}

			{#each chat.state.messages as message (message.id)}
				<MessageBubble {message} />
			{/each}

			<ToolStrip tools={chat.state.tools} />

			{#if chat.state.streamText}
				<MessageBubble
					message={{ id: 'stream', role: 'assistant', text: chat.state.streamText }}
				/>
			{/if}
		</section>

		{#if chat.state.error}
			<p class="mx-auto mt-3 w-full max-w-3xl text-sm text-destructive">{chat.state.error}</p>
		{/if}
		{#if sessions.state.error}
			<p class="mx-auto mt-3 w-full max-w-3xl text-sm text-destructive">{sessions.state.error}</p>
		{/if}

		<form
			class="mx-auto mt-4 flex w-full max-w-3xl flex-col gap-3"
			onsubmit={(event) => {
				event.preventDefault();
				void handleSend();
			}}
		>
			<Textarea
				bind:value={draft}
				placeholder="Describe your business, jurisdiction, project, and timeline…"
				disabled={chat.state.sending || !chat.state.connected}
				onkeydown={handleKeydown}
			/>
			<div class="flex items-center justify-between gap-3">
				<p class="text-xs text-muted-foreground">Enter to send · Shift+Enter for newline</p>
				<div class="flex gap-2">
					{#if chat.state.sending}
						<Button variant="outline" type="button" onclick={() => void chat.abortActiveRun()}>
							<Square class="h-4 w-4" />
							Stop
						</Button>
					{/if}
					<Button
						type="submit"
						disabled={chat.state.sending || !chat.state.connected || !draft.trim()}
					>
						<Send class="h-4 w-4" />
						Send
					</Button>
				</div>
			</div>
		</form>
	</div>
</div>
