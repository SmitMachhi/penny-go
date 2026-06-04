<script lang="ts">
	import { CONSULTATION_STARTERS, EXAMPLE_STARTERS } from '$lib/chat/starter-prompts.js';

	type Props = {
		disabled?: boolean;
		onSelect: (prompt: string) => void;
	};

	let { disabled = false, onSelect }: Props = $props();
</script>

<div class="flex flex-col gap-6">
	<div class="grid gap-3 sm:grid-cols-2">
		{#each CONSULTATION_STARTERS as starter (starter.id)}
			<button
				type="button"
				class="rounded-xl border border-border bg-background px-4 py-4 text-left transition-colors hover:bg-muted disabled:opacity-50"
				{disabled}
				onclick={() => onSelect(starter.prompt)}
			>
				<p class="text-sm font-semibold text-foreground">{starter.label}</p>
				<p class="mt-1.5 text-sm leading-snug text-muted-foreground">{starter.description}</p>
			</button>
		{/each}
	</div>

	<div class="flex flex-col gap-2">
		<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Or try an example</p>
		<div class="flex flex-wrap gap-2">
			{#each EXAMPLE_STARTERS as example (example.chip)}
				<button
					type="button"
					class="max-w-full shrink-0 rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted disabled:opacity-50"
					title={example.chip}
					{disabled}
					onclick={() => onSelect(example.prompt)}
				>
					<span class="block truncate">{example.chip}</span>
				</button>
			{/each}
		</div>
	</div>
</div>
