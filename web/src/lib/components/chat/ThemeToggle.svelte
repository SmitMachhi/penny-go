<script lang="ts">
	import { Moon, Sun } from '@lucide/svelte';
	import { mode, toggleMode } from 'mode-watcher';

	import Button from '$lib/components/ui/button.svelte';
</script>

<Button variant="ghost" size="icon" onclick={toggleMode}>
	{#if mode.current === 'dark'}
		<Sun class="h-4 w-4" />
	{:else}
		<Moon class="h-4 w-4" />
	{/if}
</Button>
