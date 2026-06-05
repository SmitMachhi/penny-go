<script lang="ts">
	import LoadingSurface from '$lib/components/ui/LoadingSurface.svelte';

	const ASSISTANT_LINE_CLASSES: readonly string[] = ['w-[88%]', 'w-[72%]', 'w-[54%]'];
	const USER_LINE_CLASSES: readonly string[] = ['w-[68%]', 'w-[42%]'];
</script>

<div class="w-full space-y-7" role="status" aria-live="polite" aria-busy="true">
	<div class="space-y-3">
		<LoadingSurface class="h-4 w-28" shape="line" label="Loading conversation header" />
		<div class="space-y-2">
			{#each ASSISTANT_LINE_CLASSES as lineClass}
				<LoadingSurface class={lineClass + ' h-3.5'} shape="line" />
			{/each}
		</div>
	</div>

	<div class="flex justify-end">
		<div class="w-[min(24rem,82%)] rounded-[1.25rem] bg-penny-user-bubble/55 px-4 py-3">
			<div class="space-y-2">
				{#each USER_LINE_CLASSES as lineClass}
					<LoadingSurface class={lineClass + ' h-3'} shape="line" tone="strong" />
				{/each}
			</div>
		</div>
	</div>

	<div class="space-y-2">
		<LoadingSurface class="h-3.5 w-[79%]" shape="line" />
		<LoadingSurface class="h-3.5 w-[63%]" shape="line" />
	</div>
</div>
