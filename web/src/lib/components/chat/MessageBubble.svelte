<script lang="ts">
	import { Check, Copy } from '@lucide/svelte';

	import type { ArtifactSummary } from '$lib/chat/artifacts.js';
	import type { ChatMessage } from '$lib/chat/messages.js';
	import { enhanceLinkPreviews } from '$lib/chat/link-preview-action.js';
	import { renderAssistantMessageContent } from '$lib/chat/message-render.js';
	import ArtifactPlanNudge from '$lib/components/chat/ArtifactPlanNudge.svelte';
	import { cn } from '$lib/utils.js';

	const COPY_FEEDBACK_MS = 2000;
	const STREAMING_DRAFT_LABEL = 'drafting answer';

	type Props = {
		message: ChatMessage;
		planNudgeArtifact?: ArtifactSummary | null;
		streaming?: boolean;
		onOpenArtifact?: (artifactId: string) => void;
	};

	let { message, planNudgeArtifact = null, streaming = false, onOpenArtifact }: Props = $props();

	let copied = $state(false);

	const rendered = $derived(
		message.role === 'assistant'
			? renderAssistantMessageContent({ text: message.text, streaming })
			: null
	);

	const hasTable = $derived(
		message.role === 'assistant' &&
			!streaming &&
			/\|/.test(message.text) &&
			/\n\|[-:\s|]+\|/.test(message.text)
	);

	async function copyMessageText(): Promise<void> {
		try {
			await navigator.clipboard.writeText(message.text);
			copied = true;
			window.setTimeout(() => {
				copied = false;
			}, COPY_FEEDBACK_MS);
		} catch {
			copied = false;
		}
	}
</script>

{#if message.role === 'user'}
	<div class="group flex items-end justify-end gap-1.5">
		<button
			type="button"
			class={cn(
				'mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground',
				'border border-transparent opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100',
				'hover:border-primary/35 hover:text-primary'
			)}
			aria-label={copied ? 'Copied' : 'Copy message'}
			onclick={() => void copyMessageText()}
		>
			{#if copied}
				<Check class="h-3.5 w-3.5" />
			{:else}
				<Copy class="h-3.5 w-3.5" />
			{/if}
		</button>
		<div
			class="penny-user-bubble max-w-[85%] rounded-[1.25rem] px-4 py-2.5 text-[0.9375rem] leading-relaxed whitespace-pre-wrap"
		>
			{message.text}
		</div>
	</div>
	{:else}
		<article
			class={cn(
				'w-full',
				streaming &&
					'penny-draft-answer max-w-prose rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5'
			)}
		>
			{#if streaming}
				<div class="mb-1 text-xs font-medium tracking-normal text-muted-foreground">
					{STREAMING_DRAFT_LABEL}
				</div>
			{/if}
			{#if rendered?.kind === 'text'}
				<div
					class="penny-markdown whitespace-pre-wrap"
				>
					{rendered.text}<span class="penny-stream-cursor ml-0.5 inline-block">▌</span>
				</div>
			{:else if rendered}
				<div
					class={cn('penny-markdown', hasTable && 'penny-markdown-has-table')}
					use:enhanceLinkPreviews
				>
					{@html rendered.html}
				</div>
			{/if}
			{#if planNudgeArtifact}
				<ArtifactPlanNudge artifact={planNudgeArtifact} {onOpenArtifact} />
			{/if}
		{#if !streaming}
			<div class="mt-2 flex items-center">
				<button
					type="button"
					class="flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-muted-foreground hover:border-primary/35 hover:text-primary"
					aria-label={copied ? 'Copied' : 'Copy response'}
					onclick={() => void copyMessageText()}
				>
					{#if copied}
						<Check class="h-3.5 w-3.5" />
					{:else}
						<Copy class="h-3.5 w-3.5" />
					{/if}
				</button>
			</div>
		{/if}
	</article>
{/if}
