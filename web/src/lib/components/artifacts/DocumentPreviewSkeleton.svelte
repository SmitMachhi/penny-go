<script lang="ts">
	import LoadingSurface from '$lib/components/ui/LoadingSurface.svelte';

	type Props = {
		title?: string | null;
		status: string;
		version: number;
	};

	let { title = null, status, version }: Props = $props();

	const PAGE_LINE_CLASSES: readonly string[] = [
		'w-[88%]',
		'w-[74%]',
		'w-[82%]',
		'w-[64%]',
		'w-[78%]',
		'w-[52%]'
	];
</script>

<div class="flex min-h-0 flex-1 flex-col bg-muted/30 p-4" role="status" aria-live="polite">
	<div class="mb-3 flex shrink-0 items-start justify-between gap-3">
		<div class="min-w-0">
			<p class="truncate text-sm font-semibold text-foreground">{title ?? 'Plan preview'}</p>
			<p class="mt-0.5 text-xs text-muted-foreground">v{version} · {status}</p>
		</div>
		<LoadingSurface class="h-7 w-16 shrink-0" shape="line" />
	</div>

	<div class="mx-auto flex min-h-0 w-full max-w-[38rem] flex-1 flex-col rounded-sm bg-white p-8 shadow-sm">
		<LoadingSurface class="mb-7 h-5 w-[62%]" shape="line" tone="strong" />
		<div class="space-y-3">
			{#each PAGE_LINE_CLASSES as lineClass}
				<LoadingSurface class={lineClass + ' h-3'} shape="line" />
			{/each}
		</div>
		<div class="mt-8 grid grid-cols-[1fr_5rem] gap-3">
			<LoadingSurface class="h-24" />
			<div class="space-y-2">
				<LoadingSurface class="h-3 w-full" shape="line" />
				<LoadingSurface class="h-3 w-4/5" shape="line" />
			</div>
		</div>
	</div>
</div>
