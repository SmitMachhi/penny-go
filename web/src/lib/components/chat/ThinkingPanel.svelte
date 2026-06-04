<script lang="ts">
	import { tick } from 'svelte';
	import { ChevronRight } from '@lucide/svelte';

	import type { ToolActivity } from '$lib/chat/messages.js';
	import ToolStrip from '$lib/components/chat/ToolStrip.svelte';
	import { cn } from '$lib/utils.js';

	const GENERIC_STATUS_LINES = new Set(['Thinking…', 'Thinking...', 'Working for you…']);

	type Props = {
		text: string;
		tools?: ToolActivity[];
		statusHeadline?: string;
		expanded?: boolean;
		streaming?: boolean;
		hideStatus?: boolean;
		onToggle?: () => void;
	};

	let {
		text,
		tools = [],
		statusHeadline = '',
		expanded: controlledExpanded = false,
		streaming = false,
		hideStatus = false,
		onToggle
	}: Props = $props();

	let internalExpanded = $state(false);
	let traceEl = $state<HTMLDivElement | null>(null);
	const isControlled = $derived(onToggle !== undefined);
	const expanded = $derived(isControlled ? controlledExpanded : internalExpanded);
	const showTools = $derived(streaming && tools.length > 0);
	const showWorkingHint = $derived(streaming && tools.length === 0);
	const traceVisible = $derived(expanded && text.trim().length > 0);
	const panelVisible = $derived(streaming || text.trim().length > 0);

	const status = $derived(statusHeadline.trim());
	const showStatusLine = $derived(
		streaming &&
			!hideStatus &&
			status.length > 0 &&
			!GENERIC_STATUS_LINES.has(status)
	);

	const label = 'Thinking';

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

{#if panelVisible}
	<div class="w-full" role="status" aria-live="polite" aria-busy={streaming}>
		<button
			type="button"
			class={cn(
				'flex w-full items-start gap-2 py-0.5 text-left transition-colors hover:text-primary',
				streaming ? 'text-sm' : 'text-xs text-muted-foreground'
			)}
			onclick={handleToggle}
		>
			{#if streaming}
				<img
					class="penny-activity-avatar mt-0.5 h-5 w-5 shrink-0 rounded-md"
					src="/penny-icon.png"
					alt=""
					width="20"
					height="20"
				/>
			{/if}
			<span class="min-w-0 flex-1">
				<span class="flex items-center gap-1">
					<span class={cn(streaming ? 'font-medium text-foreground' : 'text-muted-foreground')}>
						{label}
					</span>
					<ChevronRight
						class={cn('h-3.5 w-3.5 shrink-0 transition-transform', expanded && 'rotate-90')}
					/>
				</span>
				{#if showStatusLine}
					{#key status}
						<span class="penny-activity-status mt-0.5 block text-sm font-normal text-muted-foreground">
							{status}
						</span>
					{/key}
				{/if}
			</span>
		</button>

		{#if expanded}
			<div class="mt-2 space-y-2 border-l-2 border-primary/20 pl-3">
				{#if showTools}
					<ToolStrip {tools} />
				{:else if showWorkingHint}
					<p class="text-xs text-muted-foreground">Working…</p>
				{/if}
				{#if traceVisible}
					<div
						bind:this={traceEl}
						class={cn(
							'text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground',
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
	</div>
{/if}
