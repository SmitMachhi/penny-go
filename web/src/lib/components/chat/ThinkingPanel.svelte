<script lang="ts">
	import { tick } from 'svelte';
	import { ChevronRight } from '@lucide/svelte';

	import { cn } from '$lib/utils.js';

	type Props = {
		text: string;
		expanded?: boolean;
		streaming?: boolean;
		onToggle?: () => void;
	};

	let {
		text,
		expanded: controlledExpanded = false,
		streaming = false,
		onToggle
	}: Props = $props();

	let internalExpanded = $state(false);
	let traceEl = $state<HTMLDivElement | null>(null);
	const isControlled = $derived(onToggle !== undefined);
	const expanded = $derived(isControlled ? controlledExpanded : internalExpanded);
	const traceVisible = $derived(expanded && text.trim().length > 0);

	const label = $derived(streaming ? 'Research trace' : 'How Penny researched this');

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
		void tick().then(() => {
			if (!traceEl) {
				return;
			}
			traceEl.scrollTop = traceEl.scrollHeight;
		});
	});
</script>

{#if text.trim()}
	<div class="w-full">
		<button
			type="button"
			class="flex items-center gap-1 py-0.5 text-xs text-muted-foreground transition-colors hover:text-primary"
			onclick={handleToggle}
		>
			<span>{label}</span>
			<ChevronRight
				class={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-90')}
			/>
		</button>

		{#if traceVisible}
			<div
				bind:this={traceEl}
				class={cn(
					'mt-1.5 text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground',
					streaming
						? 'penny-thinking-trace-scroll max-h-[var(--penny-thinking-idle-max-height)] overflow-y-auto'
						: 'penny-overlay-scroll max-h-[var(--penny-thinking-idle-max-height)] overflow-y-auto'
				)}
			>
				{text}
			</div>
		{/if}
	</div>
{/if}
