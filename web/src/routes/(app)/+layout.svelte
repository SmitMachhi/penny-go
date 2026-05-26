<script lang="ts">
	import PennyShell from '$lib/components/chat/PennyShell.svelte';

	let { children } = $props();
</script>

<PennyShell>
	{@render children?.()}
</PennyShell>
