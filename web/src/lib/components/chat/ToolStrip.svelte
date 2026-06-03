<script lang="ts">
	import { Check } from '@lucide/svelte';

	import type { ToolActivity } from '$lib/chat/messages.js';
	import {
		capsuleClass,
		getToolPresentation,
		iconClass,
		sortToolsForDisplay
	} from '$lib/chat/tool-presentations.js';
	import { cn } from '$lib/utils.js';

	type Props = {
		tools: ToolActivity[];
	};

	let { tools }: Props = $props();

	const visibleTools = $derived(sortToolsForDisplay(tools));
</script>

{#if visibleTools.length > 0}
	<div class="flex flex-wrap gap-2 px-1" role="status" aria-live="polite">
		{#each visibleTools as tool (tool.id)}
			{@const presentation = getToolPresentation(tool.name)}
			{@const Icon = presentation.Icon}
			<span
				class={cn(
					'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors duration-300',
					capsuleClass(presentation, tool.phase),
					tool.phase === 'running' && 'penny-tool-capsule--running'
				)}
			>
				<span
					class={cn(
						'inline-flex shrink-0 items-center justify-center',
						iconClass(presentation, tool.phase),
						tool.phase === 'running' && presentation.spinWhenRunning && 'penny-tool-capsule-icon--running',
						tool.phase === 'running' && !presentation.spinWhenRunning && 'animate-pulse'
					)}
				>
					{#if tool.phase === 'done'}
						<Check class="h-3.5 w-3.5" strokeWidth={2.5} />
					{:else}
						<Icon class="h-3.5 w-3.5" strokeWidth={2.25} />
					{/if}
				</span>
				<span>{presentation.label}</span>
			</span>
		{/each}
	</div>
{/if}
