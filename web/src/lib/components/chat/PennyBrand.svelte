<script lang="ts">
	import { getPennyContext } from '$lib/chat/penny-context.js';
	import { cn } from '$lib/utils.js';

	type Props = {
		compact?: boolean;
		showLabel?: boolean;
		class?: string;
	};

	let { compact = true, showLabel = true, class: className }: Props = $props();

	const { chat } = getPennyContext();
</script>

<a
	href="/"
	class={cn(
		'flex min-w-0 items-center gap-2 font-semibold tracking-tight text-foreground hover:opacity-80',
		compact ? 'text-lg' : 'text-xl',
		className
	)}
>
	<div
		class={cn(
			'penny-header-icon',
			compact && 'penny-header-icon--compact',
			chat.state.sending && 'penny-header-icon--thinking'
		)}
		aria-hidden="true"
	>
		<img src="/penny-icon.png" alt="" width="32" height="32" />
	</div>
	{#if showLabel}
		<span>Penny</span>
	{/if}
</a>
