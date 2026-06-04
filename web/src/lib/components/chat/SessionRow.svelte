<script lang="ts">
	import { onMount } from 'svelte';
	import { MoreHorizontal } from '@lucide/svelte';

	import type { PennySession } from '$lib/chat/sessions.svelte.js';
	import { cn } from '$lib/utils.js';

	type Props = {
		session: PennySession;
		active: boolean;
		onSelect: () => void;
		onRename: (label: string) => void;
		onDelete: () => void;
	};

	let { session, active, onSelect, onRename, onDelete }: Props = $props();

	let editing = $state(false);
	let draft = $state('');
	let menuOpen = $state(false);
	let menuRoot: HTMLDivElement | undefined = $state();

	function closeMenu() {
		menuOpen = false;
	}

	function handleDocumentClick(event: MouseEvent) {
		if (!menuOpen || !menuRoot) {
			return;
		}
		const target = event.target;
		if (target instanceof Node && !menuRoot.contains(target)) {
			closeMenu();
		}
	}

	onMount(() => {
		document.addEventListener('click', handleDocumentClick);
		return () => document.removeEventListener('click', handleDocumentClick);
	});

	function startRename() {
		menuOpen = false;
		draft = session.title;
		editing = true;
	}

	function commitRename() {
		const label = draft.trim();
		editing = false;
		if (label && label !== session.title) {
			onRename(label);
		}
	}

	function handleRenameKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			commitRename();
		}
		if (event.key === 'Escape') {
			editing = false;
			draft = session.title;
		}
	}
</script>

<div class="group relative">
	{#if editing}
		<input
			class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
			bind:value={draft}
			maxlength="60"
			onblur={commitRename}
			onkeydown={handleRenameKeydown}
		/>
	{:else}
		<button
			type="button"
			class={cn(
				'w-full rounded-lg border px-3 py-2 text-left transition-colors',
				active
					? 'border-primary/45 text-primary'
					: 'border-transparent hover:border-primary/35'
			)}
			onclick={onSelect}
			ondblclick={startRename}
		>
			<p class="truncate text-sm font-medium">
				{session.title}
				{#if session.titleStatus === 'loading'}
					<span class="text-muted-foreground"> …</span>
				{/if}
			</p>
		</button>
	{/if}

	<div class="absolute right-1 top-1" bind:this={menuRoot}>
		<button
			type="button"
			class={cn(
				'rounded-md p-1 transition-opacity hover:bg-background/80',
				active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
			)}
			aria-label="Session actions"
			onclick={(event) => {
				event.stopPropagation();
				menuOpen = !menuOpen;
			}}
		>
			<MoreHorizontal class="h-4 w-4" />
		</button>
		{#if menuOpen}
			<div
				class="absolute right-0 z-10 mt-1 min-w-28 rounded-lg border border-border bg-card py-1"
			>
				<button
					type="button"
					class="block w-full px-3 py-1.5 text-left text-sm hover:text-primary"
					onclick={startRename}
				>
					Rename
				</button>
				<button
					type="button"
					class="block w-full px-3 py-1.5 text-left text-sm text-destructive hover:text-destructive/80"
					onclick={() => {
						menuOpen = false;
						onDelete();
					}}
				>
					Delete
				</button>
			</div>
		{/if}
	</div>
</div>
