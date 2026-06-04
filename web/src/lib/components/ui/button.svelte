<script lang="ts">
	import { cn } from '$lib/utils.js';
	import type { Snippet } from 'svelte';

	type Props = {
		class?: string;
		variant?: 'default' | 'ghost' | 'outline';
		size?: 'default' | 'icon';
		disabled?: boolean;
		type?: 'button' | 'submit';
		'aria-label'?: string;
		'aria-expanded'?: boolean;
		onclick?: (event: MouseEvent) => void;
		children: Snippet;
	};

	let {
		class: className,
		variant = 'default',
		size = 'default',
		disabled = false,
		type = 'button',
		'aria-label': ariaLabel,
		'aria-expanded': ariaExpanded,
		onclick,
		children
	}: Props = $props();
</script>

<button
	{type}
	{disabled}
	{onclick}
	aria-label={ariaLabel}
	aria-expanded={ariaExpanded}
	class={cn(
		'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
		variant === 'default' && 'bg-primary text-primary-foreground hover:opacity-90',
		variant === 'ghost' && 'hover:bg-accent hover:text-accent-foreground',
		variant === 'outline' &&
			'border border-border bg-card hover:border-primary/30 hover:bg-penny-brand-subtle',
		size === 'default' && 'h-10 px-4 py-2',
		size === 'icon' && 'h-10 w-10',
		className
	)}
>
	{@render children()}
</button>
