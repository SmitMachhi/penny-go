<script lang="ts">
	import PennyContextProvider from '$lib/components/chat/PennyContextProvider.svelte';
	import PennyShell from '$lib/components/chat/PennyShell.svelte';

	let { children } = $props();
</script>

<PennyContextProvider>
	<PennyShell>
		{@render children?.()}
	</PennyShell>
</PennyContextProvider>
