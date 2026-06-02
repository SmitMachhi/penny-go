<script lang="ts">
	import { STARTER_PROMPTS } from '$lib/chat/starter-prompts.js';

	type Props = {
		disabled?: boolean;
		onSelect: (prompt: string) => void;
	};

	let { disabled = false, onSelect }: Props = $props();
</script>

<div class="flex flex-col gap-2">
	<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Try an opener</p>
	<div class="flex flex-wrap gap-2">
		{#each STARTER_PROMPTS as prompt (prompt)}
			<button
				type="button"
				class="rounded-full border border-border bg-background px-4 py-2 text-left text-sm leading-snug text-foreground transition-colors hover:bg-muted disabled:opacity-50"
				{disabled}
				onclick={() => onSelect(prompt)}
			>
				{prompt}
			</button>
		{/each}
	</div>
</div>
