<script lang="ts">
	import { cn } from '$lib/utils.js';

	type Props = {
		class?: string;
		value?: string;
		placeholder?: string;
		disabled?: boolean;
		rows?: number;
		oninput?: (event: Event) => void;
		onkeydown?: (event: KeyboardEvent) => void;
	};

	let {
		class: className,
		value = $bindable(''),
		placeholder = '',
		disabled = false,
		rows = 3,
		oninput,
		onkeydown
	}: Props = $props();
</script>

<textarea
	bind:value
	{placeholder}
	{disabled}
	{rows}
	{oninput}
	{onkeydown}
	class={cn(
		'w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-sm outline-none ring-primary/30 focus:ring-2',
		className
	)}
></textarea>
