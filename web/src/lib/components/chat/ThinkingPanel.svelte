<script lang="ts">
	import { tick } from 'svelte';
	import { Brain, ChevronRight } from '@lucide/svelte';

	import type { ToolActivity } from '$lib/chat/messages.js';
	import { hasRunningTools } from '$lib/chat/tool-presentations.js';
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
	let traceEl = $state<HTMLDivElement | null>(null);
	const isControlled = $derived(onToggle !== undefined);
	const expanded = $derived(isControlled ? controlledExpanded : internalExpanded);

	const hasContent = $derived(streaming || text.trim().length > 0 || tools.length > 0);

	const hasActiveTools = $derived(tools.length > 0);
	const showToolStrip = $derived(hasActiveTools && (expanded || streaming));

	const label = $derived.by(() => {
		if (streaming && hasRunningTools(tools)) {
			return 'Working for you…';
		}
		if (streaming) {
			return 'Thinking…';
		}
		if (expanded) {
			return 'Thought';
		}
		return 'How Penny researched this';
	});

	function handleToggle(): void {
		if (onToggle) {
			onToggle();
			return;
		}
		internalExpanded = !internalExpanded;
	}

	$effect(() => {
		if (!streaming || !expanded || !traceEl) {
			return;
		}
		void text;
		void tools.length;
		void tick().then(() => {
			if (!traceEl) {
				return;
			}
			traceEl.scrollTop = traceEl.scrollHeight;
		});
	});
</script>

{#if hasContent}
	<div class="w-full">
		<button
			type="button"
			class="flex items-center gap-1.5 py-1 text-sm text-muted-foreground transition-colors hover:text-primary"
			onclick={handleToggle}
		>
			<Brain class={cn('h-4 w-4 shrink-0', streaming && 'animate-pulse')} />
			<span>{label}</span>
			<ChevronRight class={cn('h-4 w-4 shrink-0 transition-transform', expanded && 'rotate-90')} />
		</button>

		{#if showToolStrip}
			<div class={cn('mt-2', !expanded && 'mt-1.5')}>
				<ToolStrip {tools} />
			</div>
		{/if}

		{#if expanded}
			<div
				bind:this={traceEl}
				class={cn(
					'mt-2 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground',
					streaming
						? 'penny-thinking-trace-scroll max-h-[var(--penny-thinking-stream-max-height)] overflow-y-auto'
						: 'penny-overlay-scroll max-h-[var(--penny-thinking-idle-max-height)] overflow-y-auto'
				)}
			>
				{text}
				{#if streaming}
					<span class="penny-stream-cursor ml-0.5 inline-block">▌</span>
				{/if}
			</div>
		{/if}
	</div>
{/if}
