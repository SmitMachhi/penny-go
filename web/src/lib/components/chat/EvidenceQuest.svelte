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

<style>
	.penny-evidence-quest {
		display: grid;
		grid-template-columns: 25px minmax(0, 1fr);
		column-gap: 0.625rem;
		row-gap: 0.4375rem;
		align-items: start;
		padding-inline: 0.125rem;
		animation: penny-evidence-quest-enter 520ms cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	.penny-evidence-quest__icon {
		width: 25px;
		height: 25px;
		border-radius: 9px;
		display: block;
		object-fit: cover;
		box-shadow: 0 10px 24px -17px var(--primary);
		animation: penny-evidence-quest-breathe 2600ms ease-in-out infinite;
	}

	.penny-evidence-quest__body {
		min-width: 0;
		display: grid;
		gap: 0.4375rem;
	}

	.penny-evidence-quest__top {
		display: flex;
		min-width: 0;
		align-items: center;
		gap: 0.625rem;
		padding-top: 0.125rem;
	}

	.penny-evidence-quest__status {
		color: var(--foreground);
		font-size: 0.8125rem;
		font-weight: 700;
		line-height: 1.35;
		white-space: nowrap;
	}

	.penny-evidence-quest__route {
		display: flex;
		min-width: 7.375rem;
		align-items: center;
		gap: 0.3125rem;
		opacity: 0.92;
		transform-origin: left center;
		transition:
			opacity 220ms cubic-bezier(0.16, 1, 0.3, 1),
			transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
	}

	.penny-evidence-quest--answering .penny-evidence-quest__route {
		opacity: 0;
		transform: translate3d(-4px, 0, 0) scaleX(0.94);
	}

	.penny-evidence-quest__dot {
		width: 6px;
		height: 6px;
		border-radius: 999px;
		background: color-mix(in oklch, var(--muted-foreground) 28%, transparent);
	}

	.penny-evidence-quest__dot--done {
		background: var(--primary);
	}

	.penny-evidence-quest__dot--active {
		background: oklch(0.65 0.16 78);
		animation: penny-evidence-quest-dot-pulse 1500ms ease-in-out infinite;
	}

	.penny-evidence-quest__rail {
		width: 20px;
		height: 1px;
		background: var(--border);
		transform-origin: left center;
		animation: penny-evidence-quest-rail-fill 620ms cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	.penny-evidence-quest__tokens {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4375rem;
		align-items: center;
	}

	.penny-evidence-quest__token {
		display: inline-flex;
		min-height: 24px;
		align-items: center;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: var(--background);
		padding: 0.25rem 0.5rem;
		color: var(--muted-foreground);
		font-size: 0.75rem;
		line-height: 1;
		animation: penny-evidence-quest-token-pop 480ms cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	.penny-evidence-quest__token--corpus {
		border-color: color-mix(in oklch, oklch(0.76 0.15 78) 55%, var(--border));
		background: color-mix(in oklch, oklch(0.96 0.04 78) 72%, var(--background));
		color: oklch(0.45 0.13 72);
	}

	.penny-evidence-quest__token--source {
		border-color: color-mix(in oklch, oklch(0.76 0.12 155) 58%, var(--border));
		background: color-mix(in oklch, oklch(0.96 0.04 155) 72%, var(--background));
		color: oklch(0.42 0.11 155);
	}

	.penny-evidence-quest__token--web,
	.penny-evidence-quest__token--plan {
		border-color: color-mix(in oklch, var(--primary) 32%, var(--border));
		background: color-mix(in oklch, var(--primary) 8%, var(--background));
		color: var(--primary);
	}

	@keyframes penny-evidence-quest-enter {
		from {
			opacity: 0;
			transform: translate3d(0, 8px, 0);
			filter: blur(3px);
		}
		to {
			opacity: 1;
			transform: translate3d(0, 0, 0);
			filter: blur(0);
		}
	}

	@keyframes penny-evidence-quest-breathe {
		0%,
		100% {
			transform: translate3d(0, 0, 0) scale(1);
		}
		50% {
			transform: translate3d(0, -1px, 0) scale(1.035);
		}
	}

	@keyframes penny-evidence-quest-dot-pulse {
		0%,
		100% {
			opacity: 0.86;
			transform: scale(1);
		}
		50% {
			opacity: 1;
			transform: scale(1.28);
		}
	}

	@keyframes penny-evidence-quest-rail-fill {
		from {
			opacity: 0.35;
			transform: scaleX(0.15);
		}
		to {
			opacity: 1;
			transform: scaleX(1);
		}
	}

	@keyframes penny-evidence-quest-token-pop {
		from {
			opacity: 0;
			transform: translate3d(0, 5px, 0) scale(0.96);
		}
		to {
			opacity: 1;
			transform: translate3d(0, 0, 0) scale(1);
		}
	}

	@media (max-width: 640px) {
		.penny-evidence-quest__top {
			align-items: flex-start;
			flex-direction: column;
			gap: 0.4375rem;
		}

		.penny-evidence-quest__status {
			white-space: normal;
		}

		.penny-evidence-quest__route {
			min-width: 5.875rem;
		}

		.penny-evidence-quest__rail {
			width: 14px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.penny-evidence-quest,
		.penny-evidence-quest__icon,
		.penny-evidence-quest__dot--active,
		.penny-evidence-quest__rail,
		.penny-evidence-quest__token {
			animation: none;
		}

		.penny-evidence-quest__route {
			transition: none;
		}
	}
</style>
