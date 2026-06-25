<script lang="ts">
	import { goto } from '$app/navigation';
	import { LogOut, PanelLeftClose, SquarePen } from '@lucide/svelte';

	import { getPennyContext } from '$lib/chat/penny-context.js';
	import { chatPathFromSessionKey, routeIdFromSessionKey } from '$lib/chat/session-routes.js';
	import DeleteSessionDialog from '$lib/components/chat/DeleteSessionDialog.svelte';
	import PennyBrand from '$lib/components/chat/PennyBrand.svelte';
	import SessionRow from '$lib/components/chat/SessionRow.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { cn } from '$lib/utils.js';

	type Props = {
		activeRouteId: string | null;
	};

	let { activeRouteId }: Props = $props();

	const { chat, sessions } = getPennyContext();
	let pendingDeleteKey = $state<string | null>(null);

	function closeSidebar() {
		sessions.state.sidebarOpen = false;
	}

	function collapseSidebar() {
		sessions.state.sidebarCollapsed = true;
		sessions.state.sidebarOpen = false;
	}

	async function handleNewChat() {
		closeSidebar();
		await chat.clearSession();
		await goto('/');
	}

	async function handleSelectSession(sessionKey: string) {
		const path = chatPathFromSessionKey(sessionKey);
		if (!path) {
			return;
		}
		closeSidebar();
		await goto(path);
	}

	async function confirmDelete() {
		if (!pendingDeleteKey) {
			return;
		}
		const deletedKey = pendingDeleteKey;
		const wasActive = routeIdFromSessionKey(deletedKey) === activeRouteId;
		pendingDeleteKey = null;
		if (wasActive) {
			void chat.clearSession();
			await goto('/');
		}
		const ok = await sessions.deleteSession(deletedKey);
		if (!ok && wasActive) {
			const path = chatPathFromSessionKey(deletedKey);
			if (path) {
				await goto(path);
			}
		}
	}
</script>

{#if sessions.state.sidebarOpen}
	<button
		type="button"
		class="fixed inset-0 z-40 bg-black/40 md:hidden"
		aria-label="Close sidebar"
		onclick={closeSidebar}
	></button>
{/if}

<aside
	class={cn(
		'z-50 flex h-full w-[260px] shrink-0 flex-col border-r border-border bg-penny-brand-muted/60',
		sessions.state.sidebarOpen
			? 'fixed inset-y-0 left-0 border-r border-border'
			: 'hidden',
		!sessions.state.sidebarCollapsed && 'md:static md:flex'
	)}
>
	<div class="flex items-center justify-between gap-2 px-3 py-3">
		<PennyBrand />
		<Button
			variant="ghost"
			size="icon"
			class="h-8 w-8 shrink-0"
			onclick={collapseSidebar}
			aria-label="Close sidebar"
		>
			<PanelLeftClose class="h-4 w-4" />
		</Button>
	</div>

	<div class="px-2 pb-2">
		<Button
			variant="ghost"
			class="h-9 w-full justify-start gap-2 px-2 text-sm font-normal"
			onclick={() => void handleNewChat()}
		>
			<SquarePen class="h-4 w-4" />
			New chat
		</Button>
	</div>

	<div class="px-3 pb-1 pt-1">
		<span class="text-sm font-semibold text-foreground">Recents</span>
	</div>

	<div class="flex-1 space-y-1 overflow-y-auto px-2 pb-2 penny-overlay-scroll">
		{#if sessions.state.loading}
			<p class="px-2 py-3 text-sm text-muted-foreground">Loading chats…</p>
		{:else if sessions.state.sessions.length === 0}
			<p class="px-2 py-3 text-sm text-muted-foreground">No chats yet.</p>
		{:else}
			{#each sessions.state.sessions as session (session.key)}
				<SessionRow
					{session}
					active={routeIdFromSessionKey(session.key) === activeRouteId}
					onSelect={() => void handleSelectSession(session.key)}
					onRename={(label) => void sessions.renameSession(session.key, label)}
					onDelete={() => {
						pendingDeleteKey = session.key;
					}}
				/>
			{/each}
		{/if}
	</div>

	<form method="POST" action="/auth/sign-out" class="border-t border-border p-2">
		<Button
			type="submit"
			variant="ghost"
			class="h-9 w-full justify-start gap-2 px-2 text-sm font-normal"
		>
			<LogOut class="h-4 w-4" />
			Sign out
		</Button>
	</form>
</aside>

<DeleteSessionDialog
	open={pendingDeleteKey !== null}
	onCancel={() => {
		pendingDeleteKey = null;
	}}
	onConfirm={() => void confirmDelete()}
/>
