<script lang="ts">
	import { CONSULTATION_STARTERS, EXAMPLE_STARTERS } from '$lib/chat/starter-prompts.js';

	type Props = {
		disabled?: boolean;
		showExamples?: boolean;
		onStart: (prompt: string) => void;
	};

	let { disabled = false, showExamples = true, onStart }: Props = $props();
</script>

<div class="flex flex-col gap-6">
	<div class="grid gap-3 sm:grid-cols-2">
		{#each CONSULTATION_STARTERS as starter (starter.id)}
			<button
				type="button"
				class="rounded-xl border border-border bg-background px-4 py-4 text-left transition-colors hover:border-primary/35 hover:bg-penny-brand-subtle disabled:opacity-50"
				{disabled}
				onclick={() => onStart(starter.prompt)}
			>
				<p class="font-display text-sm font-semibold text-foreground">{starter.label}</p>
				<p class="mt-1.5 text-sm leading-snug text-muted-foreground">{starter.description}</p>
			</button>
		{/each}
	</div>

	{#if showExamples}
		<div class="flex flex-col gap-2">
			<p class="text-xs font-medium text-muted-foreground">Try an example</p>
			<div class="flex flex-wrap gap-2">
				{#each EXAMPLE_STARTERS as example (example.chip)}
					<button
						type="button"
						class="max-w-full shrink-0 rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground transition-colors hover:border-primary/35 hover:bg-penny-brand-subtle hover:text-primary disabled:opacity-50"
						title={example.chip}
						{disabled}
						onclick={() => onStart(example.prompt)}
					>
						<span class="block truncate">{example.chip}</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>
