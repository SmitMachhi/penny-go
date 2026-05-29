<script lang="ts">
	import { page } from '$app/state';
	import { onDestroy, onMount } from 'svelte';
	import { Menu } from '@lucide/svelte';

	import { ChatClient } from '$lib/chat/client.svelte.js';
	import { setPennyContext } from '$lib/chat/penny-context.js';
	import { SessionClient } from '$lib/chat/sessions.svelte.js';
	import SessionSidebar from '$lib/components/chat/SessionSidebar.svelte';
	import ThemeToggle from '$lib/components/chat/ThemeToggle.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { cn } from '$lib/utils.js';

	type Props = {
		children: import('svelte').Snippet;
	};

	let { children }: Props = $props();

	const chat = new ChatClient();
	const sessions = new SessionClient();
	let wasSending = $state(false);

	const activeRouteId = $derived(page.params.id ?? null);

	setPennyContext({ chat, sessions });

	$effect(() => {
		if (wasSending && !chat.state.sending) {
			void sessions.refresh();
		}
		wasSending = chat.state.sending;
	});

	onMount(() => {
		void chat.bootstrap().then(() => sessions.initSidebar());

		const onVisibilityChange = () => {
			if (document.visibilityState !== 'visible' || !page.params.id || !chat.state.sessionKey) {
				return;
			}
			void chat.loadHistory();
		};

		document.addEventListener('visibilitychange', onVisibilityChange);
		return () => document.removeEventListener('visibilitychange', onVisibilityChange);
	});

	onDestroy(() => {
		chat.dispose();
	});
</script>

<div class="flex h-screen overflow-hidden">
	<SessionSidebar {activeRouteId} />

	<div class="flex min-h-0 min-w-0 flex-1 flex-col">
		<header class="flex items-center justify-between gap-4 border-b border-border px-4 py-4">
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
					<h1 class="text-xl font-semibold tracking-tight">Canadian funding consultant</h1>
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

		<div class="flex min-h-0 flex-1 flex-col">
			{@render children?.()}
		</div>

		{#if chat.state.error}
			<p class="mx-auto mt-3 w-full max-w-3xl px-4 text-sm text-destructive">{chat.state.error}</p>
		{/if}
		{#if sessions.state.error}
			<p class="mx-auto mt-3 w-full max-w-3xl px-4 text-sm text-destructive">
				{sessions.state.error}
			</p>
		{/if}
	</div>
</div>
