<script lang="ts">
	import type { ToolActivity } from '$lib/chat/messages.js';
	import { toolLabel } from '$lib/chat/messages.js';

	type Props = {
		tools: ToolActivity[];
	};

	let { tools }: Props = $props();
</script>

{#if tools.length > 0}
	<div class="flex flex-wrap gap-2 px-1">
		{#each tools as tool (tool.id)}
			<span
				class="rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground"
			>
				{toolLabel(tool.name)}
				{#if tool.phase === 'running'}
					…
				{/if}
			</span>
		{/each}
	</div>
{/if}
