<script lang="ts">
	import { Check, LoaderCircle } from '@lucide/svelte';

	import type { ToolActivity } from '$lib/chat/messages.js';
	import { buildWorkSteps } from '$lib/chat/work-steps.js';
	import { cn } from '$lib/utils.js';

	type Props = {
		tools: ToolActivity[];
		sending: boolean;
	};

	let { tools, sending }: Props = $props();

	const steps = $derived(buildWorkSteps(tools, sending));
</script>

{#if steps.length > 0}
	<ol class="penny-work-steps" role="list" aria-label="Research steps">
		{#each steps as step (step.id)}
			<li
				class={cn(
					'penny-work-step',
					step.phase === 'running' && 'penny-work-step--running',
					step.phase === 'done' && 'penny-work-step--done',
					step.phase === 'pending' && 'penny-work-step--pending'
				)}
			>
				<span class="penny-work-step__marker" aria-hidden="true">
					{#if step.phase === 'done'}
						<Check class="h-3 w-3" strokeWidth={2.5} />
					{:else if step.phase === 'running'}
						<LoaderCircle class="h-3 w-3 animate-spin" strokeWidth={2.25} />
					{:else if step.phase === 'error'}
						<span class="h-1.5 w-1.5 rounded-full bg-destructive"></span>
					{:else}
						<span class="h-1.5 w-1.5 rounded-full bg-muted-foreground/35"></span>
					{/if}
				</span>
				<span class="penny-work-step__label">{step.label}</span>
			</li>
		{/each}
	</ol>
{/if}
