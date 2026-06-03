<script lang="ts">
	import { Check, Copy } from '@lucide/svelte';

	import type { ArtifactSummary } from '$lib/chat/artifacts.js';
	import type { ChatMessage } from '$lib/chat/messages.js';
	import { enhanceLinkPreviews } from '$lib/chat/link-preview-action.js';
	import { renderMarkdown } from '$lib/chat/markdown.js';
	import ArtifactChip from '$lib/components/artifacts/ArtifactChip.svelte';
	import { cn } from '$lib/utils.js';

	const COPY_FEEDBACK_MS = 2000;

	type Props = {
		message: ChatMessage;
		artifacts?: ArtifactSummary[];
		onOpenArtifact?: (artifactId: string) => void;
	};

	let { message, artifacts = [], onOpenArtifact }: Props = $props();

	let copied = $state(false);

	const html = $derived(
		message.role === 'assistant' ? renderMarkdown(message.text) : ''
	);

	const hasTable = $derived(
		message.role === 'assistant' && /\|/.test(message.text) && /\n\|[-:\s|]+\|/.test(message.text)
	);

	const linkedArtifacts = $derived(
		(message.artifactIds ?? [])
			.map((artifactId) => artifacts.find((artifact) => artifact.artifactId === artifactId))
			.filter((artifact): artifact is ArtifactSummary => artifact !== undefined)
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
				'opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100',
				'hover:bg-muted hover:text-foreground'
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
	<article class="w-full">
		{#key html}
			<div
				class={cn('penny-markdown', hasTable && 'penny-markdown-has-table')}
				use:enhanceLinkPreviews
			>
				{@html html}
			</div>
		{/key}
		{#if linkedArtifacts.length > 0 && onOpenArtifact}
			<div class="mt-3 flex flex-col gap-2">
				{#each linkedArtifacts as artifact (artifact.artifactId)}
					<ArtifactChip {artifact} onOpen={onOpenArtifact} />
				{/each}
			</div>
		{/if}
		<div class="mt-2 flex items-center">
			<button
				type="button"
				class="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
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
	</article>
{/if}
