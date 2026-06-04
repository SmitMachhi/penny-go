<script lang="ts">
	import type { ToolActivity } from '$lib/chat/messages.js';
	import { getToolPresentation } from '$lib/chat/tool-presentations.js';
	import { cn } from '$lib/utils.js';

	type Props = {
		statusHeadline: string;
		tools: ToolActivity[];
		busy?: boolean;
	};

	let { statusHeadline, tools, busy = true }: Props = $props();

	const status = $derived(statusHeadline.trim() || 'Thinking…');
	const activeTool = $derived(tools.find((tool) => tool.phase === 'running'));
	const activeToolLabel = $derived(
		activeTool ? getToolPresentation(activeTool.name).label : null
	);
</script>

<div
	class="flex items-center gap-2 py-1"
	role="status"
	aria-live="polite"
	aria-busy={busy}
>
	<img
		class="penny-activity-avatar h-5 w-5 shrink-0 rounded-md"
		src="/penny-icon.png"
		alt=""
		width="20"
		height="20"
	/>
	<p class="min-w-0 text-sm leading-snug text-muted-foreground">
		{#key status}
			<span class="penny-activity-status text-foreground">{status}</span>
		{/key}
		{#if activeToolLabel}
			<span class="text-muted-foreground/80"> · </span>
			<span class={cn('penny-activity-tool', activeTool && 'penny-activity-tool--live')}>
				{activeToolLabel}
			</span>
		{/if}
	</p>
</div>
