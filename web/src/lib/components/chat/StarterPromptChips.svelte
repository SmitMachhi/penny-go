<script lang="ts">
	import { Building2, Lightbulb } from '@lucide/svelte';
	import type { Component } from 'svelte';

	import {
		CONSULTATION_STARTERS,
		EXAMPLE_STARTERS,
		type ConsultationStarter
	} from '$lib/chat/starter-prompts.js';

	const STARTER_ICONS: Record<ConsultationStarter['id'], Component> = {
		opportunity_backed: Building2,
		aspiration_first: Lightbulb
	};

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
			{@const Icon = STARTER_ICONS[starter.id]}
			<button
				type="button"
				class="rounded-xl border border-border bg-background px-4 py-4 text-left transition-colors hover:border-primary disabled:opacity-50"
				{disabled}
				onclick={() => onStart(starter.prompt)}
			>
				<div class="flex items-center gap-2.5">
					<div
						class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/25 text-primary"
						aria-hidden="true"
					>
						<Icon class="h-4 w-4" strokeWidth={2} />
					</div>
					<p class="font-display text-sm font-semibold text-foreground">{starter.label}</p>
				</div>
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
						class="max-w-full shrink-0 rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
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
