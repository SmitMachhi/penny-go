<script lang="ts">
	import { buildEvidenceQuestState } from '$lib/chat/evidence-quest.js';
	import type { ToolActivity } from '$lib/chat/messages.js';
	import { cn } from '$lib/utils.js';

	type Props = {
		tools: ToolActivity[];
		answerStarted?: boolean;
	};

	const FINAL_STAGE_OFFSET = 1;

	let { tools, answerStarted = false }: Props = $props();

	const quest = $derived(buildEvidenceQuestState({ tools, answerStarted }));
	const stageCount = $derived(quest.stages.length);
</script>

<div
	class={cn('penny-evidence-quest', answerStarted && 'penny-evidence-quest--answering')}
	role="status"
	aria-live="polite"
	aria-busy={!answerStarted}
>
	<img
		class="penny-evidence-quest__icon"
		src="/penny-icon.png"
		alt=""
		width="25"
		height="25"
	/>

	<div class="penny-evidence-quest__body">
		<div class="penny-evidence-quest__top">
			<span class="penny-evidence-quest__status">{quest.status}</span>
			<div class="penny-evidence-quest__route" aria-hidden="true">
				{#each quest.stages as stage, index (stage.id)}
					<span
						class={cn(
							'penny-evidence-quest__dot',
							stage.phase === 'done' && 'penny-evidence-quest__dot--done',
							stage.phase === 'active' && 'penny-evidence-quest__dot--active'
						)}
					></span>
					{#if index < stageCount - FINAL_STAGE_OFFSET}
						<span class="penny-evidence-quest__rail"></span>
					{/if}
				{/each}
			</div>
		</div>

		{#if quest.tokens.length > 0}
			<div class="penny-evidence-quest__tokens">
				{#each quest.tokens as token (token.id)}
					<span
						class={cn(
							'penny-evidence-quest__token',
							`penny-evidence-quest__token--${token.kind}`
						)}
					>
						{token.label}
					</span>
				{/each}
			</div>
		{/if}
	</div>
</div>
