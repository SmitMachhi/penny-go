<script lang="ts">
	import { cn } from '$lib/utils.js';

	type LoadingShape = 'block' | 'line' | 'circle';
	type LoadingTone = 'muted' | 'strong';

	type Props = {
		class?: string;
		shape?: LoadingShape;
		tone?: LoadingTone;
		label?: string;
	};

	let {
		class: className = '',
		shape = 'block',
		tone = 'muted',
		label = 'Loading'
	}: Props = $props();

	const shapeClass = $derived(
		shape === 'circle'
			? 'rounded-full'
			: shape === 'line'
				? 'rounded-full'
				: 'rounded-xl'
	);
	const toneClass = $derived(
		tone === 'strong' ? 'penny-loading-surface--strong' : 'penny-loading-surface--muted'
	);
</script>

<span
	class={cn('penny-loading-surface block', shapeClass, toneClass, className)}
	role="presentation"
	aria-label={label}
></span>
