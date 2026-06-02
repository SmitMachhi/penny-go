<script lang="ts">
	import { Brain, ChevronRight } from '@lucide/svelte';

	import type { ToolActivity } from '$lib/chat/messages.js';
	import ToolStrip from '$lib/components/chat/ToolStrip.svelte';
	import { cn } from '$lib/utils.js';

	type Props = {
		text: string;
		tools?: ToolActivity[];
		expanded?: boolean;
		streaming?: boolean;
		onToggle?: () => void;
	};

	let {
		text,
		tools = [],
		expanded: controlledExpanded = false,
		streaming = false,
		onToggle
	}: Props = $props();

	let internalExpanded = $state(false);
	const isControlled = $derived(onToggle !== undefined);
	const expanded = $derived(isControlled ? controlledExpanded : internalExpanded);

	const hasContent = $derived(streaming || text.trim().length > 0 || tools.length > 0);

	const label = $derived(
		streaming ? 'Thinking…' : expanded ? 'Thought' : 'Thought for a moment'
	);

	function handleToggle(): void {
		if (onToggle) {
			onToggle();
			return;
		}
		internalExpanded = !internalExpanded;
	}
</script>

{#if hasContent}
	<div class="w-full">
		<button
			type="button"
			class="flex items-center gap-1.5 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
			onclick={handleToggle}
		>
			<Brain class={cn('h-4 w-4 shrink-0', streaming && 'animate-pulse')} />
			<span>{label}</span>
			<ChevronRight class={cn('h-4 w-4 shrink-0 transition-transform', expanded && 'rotate-90')} />
		</button>

		{#if expanded}
			<div
				class={cn(
					'penny-overlay-scroll mt-2 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground',
					streaming
						? 'max-h-[var(--penny-thinking-stream-max-height)] overflow-y-auto'
						: 'max-h-[var(--penny-thinking-idle-max-height)] overflow-y-auto'
				)}
			>
				{text}
				{#if streaming}
					<span class="penny-stream-cursor ml-0.5 inline-block">▌</span>
				{/if}
			</div>
			{#if tools.length > 0}
				<div class="mt-2">
					<ToolStrip {tools} />
				</div>
			{/if}
		{/if}
	</div>
{/if}
