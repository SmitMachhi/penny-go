<script lang="ts">
	import { page } from '$app/state';
	import { onDestroy, onMount } from 'svelte';
	import { FileText, Menu, PanelLeft, X } from '@lucide/svelte';

	import { ChatClient } from '$lib/chat/client.svelte.js';
	import { setPennyContext } from '$lib/chat/penny-context.js';
	import { sessionKeyFromRouteId } from '$lib/chat/session-routes.js';
	import { SessionClient } from '$lib/chat/sessions.svelte.js';
	import PennyBrand from '$lib/components/chat/PennyBrand.svelte';
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
	let bannerDismissed = $state(false);

	const APP_TITLE = 'Penny';
	const DEFAULT_SESSION_TITLE = 'New chat';

	const activeRouteId = $derived(page.params.id ?? null);
	const bannerError = $derived(chat.state.operationError ?? sessions.state.error);
	const activeSessionKey = $derived(
		activeRouteId ? sessionKeyFromRouteId(activeRouteId) : null
	);
	const activeSession = $derived(
		activeSessionKey
			? sessions.state.sessions.find((session) => session.key === activeSessionKey)
			: null
	);
	const browserTitle = $derived(
		activeSession && activeSession.title !== DEFAULT_SESSION_TITLE
			? `${activeSession.title} · ${APP_TITLE}`
			: APP_TITLE
	);
	const showSidebarBrand = $derived(sessions.state.sidebarCollapsed);

	setPennyContext({ chat, sessions });

	$effect(() => {
		if (bannerError) {
			bannerDismissed = false;
		}
	});

	$effect(() => {
		if (wasSending && !chat.state.sending && chat.state.sessionKey) {
			const firstUserMessage = chat.state.messages.find((message) => message.role === 'user');
			if (firstUserMessage?.text) {
				sessions.setTitleFromFirstMessage(chat.state.sessionKey, firstUserMessage.text);
			}
			sessions.bumpActiveSession(chat.state.sessionKey);
			void sessions.refresh({ silent: true });
		}
		wasSending = chat.state.sending;
	});

	function dismissBanner(): void {
		bannerDismissed = true;
		chat.state.operationError = null;
		sessions.state.error = null;
	}

	function openSidebar(): void {
		sessions.state.sidebarCollapsed = false;
		sessions.state.sidebarOpen = true;
	}

	onMount(() => {
		void Promise.all([chat.bootstrap(), sessions.initSidebar()]);
		chat.startHealthPolling(() => {
			void sessions.refresh({ silent: true });
		});

		const onVisibilityChange = () => {
			if (
				document.visibilityState !== 'visible' ||
				!page.params.id ||
				!chat.state.sessionKey ||
				chat.state.sending
			) {
				return;
			}
			void chat.refreshHealth();
			chat.ensureStreamConnected();
			void chat.loadHistory();
		};

		document.addEventListener('visibilitychange', onVisibilityChange);
		return () => document.removeEventListener('visibilitychange', onVisibilityChange);
	});

	onDestroy(() => {
		chat.stopHealthPolling();
		chat.dispose();
	});
</script>

<svelte:head>
	<title>{browserTitle}</title>
</svelte:head>

<div class="flex h-screen overflow-hidden">
	<SessionSidebar {activeRouteId} />

	<div class="flex min-h-0 min-w-0 flex-1 flex-col">
		<header
			class="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-primary/15 px-3 md:px-4"
		>
			<div class="flex min-w-0 items-center gap-2">
				{#if showSidebarBrand}
					<Button
						variant="ghost"
						size="icon"
						class="hidden h-8 w-8 md:inline-flex"
						onclick={openSidebar}
						aria-label="Open sidebar"
					>
						<PanelLeft class="h-4 w-4" />
					</Button>
					<PennyBrand class="hidden md:flex" />
				{/if}
				<Button
					variant="ghost"
					size="icon"
					class="h-8 w-8 md:hidden"
					onclick={openSidebar}
					aria-label="Open sidebar"
				>
					<Menu class="h-4 w-4" />
				</Button>
			</div>

			<div class="flex items-center gap-2 sm:gap-3">
				{#if chat.state.artifacts.length > 0}
					<Button
						variant={chat.state.artifactPanelOpen ? 'default' : 'outline'}
						size="icon"
						class="h-8 w-8 shrink-0 sm:h-9 sm:w-9"
						aria-expanded={chat.state.artifactPanelOpen}
						aria-label="Toggle funding plan panel"
						onclick={() => chat.toggleArtifactPanel()}
					>
						<FileText class="h-4 w-4" />
					</Button>
				{/if}
				{#if !chat.state.connected}
					<div class="flex items-center gap-2">
						<span
							class="max-w-[10rem] truncate text-xs text-destructive sm:max-w-xs"
							title={chat.state.connectionError ?? undefined}
						>
							Not connected
						</span>
						<Button
							variant="outline"
							class="h-8 px-2.5 text-xs"
							onclick={() => void chat.refreshHealth()}
						>
							Retry
						</Button>
					</div>
				{/if}
				<ThemeToggle />
			</div>
		</header>

		<div class="flex min-h-0 flex-1 flex-col">
			{@render children?.()}
		</div>

		{#if bannerError && !bannerDismissed}
			<div
				class="penny-chat-column mt-3 flex w-full items-start justify-between gap-3 px-4 text-sm text-destructive"
			>
				<p>{bannerError}</p>
				<Button variant="ghost" size="icon" onclick={dismissBanner} aria-label="Dismiss error">
					<X class="h-4 w-4" />
				</Button>
			</div>
		{/if}
	</div>
</div>
