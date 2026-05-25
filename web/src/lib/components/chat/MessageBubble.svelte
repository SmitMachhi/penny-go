<script lang="ts">
	import type { ArtifactSummary } from '$lib/chat/artifacts.js';
	import type { ChatMessage } from '$lib/chat/messages.js';
	import { renderMarkdown } from '$lib/chat/markdown.js';
	import ArtifactChip from '$lib/components/artifacts/ArtifactChip.svelte';
	import { cn } from '$lib/utils.js';

	type Props = {
		message: ChatMessage;
		artifacts?: ArtifactSummary[];
		onOpenArtifact?: (artifactId: string) => void;
	};

	let { message, artifacts = [], onOpenArtifact }: Props = $props();

	const html = $derived(
		message.role === 'assistant' ? renderMarkdown(message.text) : ''
	);

	const hasTable = $derived(message.role === 'assistant' && /\|/.test(message.text) && /\n\|[-:\s|]+\|/.test(message.text));

	const linkedArtifacts = $derived(
		(message.artifactIds ?? [])
			.map((artifactId) => artifacts.find((artifact) => artifact.artifactId === artifactId))
			.filter((artifact): artifact is ArtifactSummary => artifact !== undefined)
	);
</script>

<div class={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
	<div
		class={cn(
			'rounded-2xl px-4 py-3 text-sm leading-relaxed',
			message.role === 'user'
				? 'max-w-[85%] whitespace-pre-wrap bg-primary text-primary-foreground'
				: hasTable
					? 'w-full max-w-full border border-border bg-card text-card-foreground sm:max-w-[95%]'
					: 'max-w-[85%] border border-border bg-card text-card-foreground'
		)}
	>
		{#if message.role === 'assistant'}
			<div class="penny-markdown">{@html html}</div>
			{#if linkedArtifacts.length > 0 && onOpenArtifact}
				<div class="mt-2 flex flex-col gap-2">
					{#each linkedArtifacts as artifact (artifact.artifactId)}
						<ArtifactChip {artifact} onOpen={onOpenArtifact} />
					{/each}
				</div>
			{/if}
		{:else}
			{message.text}
		{/if}
	</div>
</div>
