<script lang="ts">
	import { Plus, X } from '@lucide/svelte';

	import type { ChatClient } from '$lib/chat/client.svelte.js';
	import type { SessionClient } from '$lib/chat/sessions.svelte.js';
	import DeleteSessionDialog from '$lib/components/chat/DeleteSessionDialog.svelte';
	import SessionRow from '$lib/components/chat/SessionRow.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { cn } from '$lib/utils.js';

	type Props = {
		chat: ChatClient;
		sessions: SessionClient;
	};

	let { chat, sessions }: Props = $props();

	let pendingDeleteKey = $state<string | null>(null);

	function closeSidebar() {
		sessions.state.sidebarOpen = false;
	}

	async function handleNewChat() {
		const created = await sessions.createSession();
		if (created) {
			await sessions.switchSession(chat, created.key);
		}
	}

	async function confirmDelete() {
		if (!pendingDeleteKey) {
			return;
		}
		const deletedKey = pendingDeleteKey;
		pendingDeleteKey = null;
		const ok = await sessions.deleteSession(deletedKey);
		if (ok) {
			await sessions.handleDeletedActiveSession(chat, deletedKey);
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
		'z-50 flex h-full w-[260px] shrink-0 flex-col border-r border-border bg-card/95',
		sessions.state.sidebarOpen
			? 'fixed inset-y-0 left-0 shadow-xl md:static md:shadow-none'
			: 'hidden md:flex'
	)}
>
	<div class="flex items-center justify-between border-b border-border p-3">
		<p class="text-sm font-semibold">Chats</p>
		<div class="flex items-center gap-1">
			<Button variant="ghost" size="icon" onclick={() => void handleNewChat()} aria-label="New chat">
				<Plus class="h-4 w-4" />
			</Button>
			<Button variant="ghost" size="icon" class="md:hidden" onclick={closeSidebar} aria-label="Close sidebar">
				<X class="h-4 w-4" />
			</Button>
		</div>
	</div>

	<div class="flex-1 space-y-1 overflow-y-auto p-2">
		{#if sessions.state.loading}
			<p class="px-2 py-3 text-sm text-muted-foreground">Loading chats…</p>
		{:else if sessions.state.sessions.length === 0}
			<p class="px-2 py-3 text-sm text-muted-foreground">No chats yet.</p>
		{:else}
			{#each sessions.state.sessions as session (session.key)}
				<SessionRow
					{session}
					active={chat.state.sessionKey === session.key}
					onSelect={() => void sessions.switchSession(chat, session.key)}
					onRename={(label) => void sessions.renameSession(session.key, label)}
					onDelete={() => {
						pendingDeleteKey = session.key;
					}}
				/>
			{/each}
		{/if}
	</div>
</aside>

<DeleteSessionDialog
	open={pendingDeleteKey !== null}
	onCancel={() => {
		pendingDeleteKey = null;
	}}
	onConfirm={() => void confirmDelete()}
/>
