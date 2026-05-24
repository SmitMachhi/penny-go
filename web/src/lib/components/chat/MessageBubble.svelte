<script lang="ts">
	import type { ChatMessage } from '$lib/chat/messages.js';
	import { renderMarkdown } from '$lib/chat/markdown.js';
	import { cn } from '$lib/utils.js';

	type Props = {
		message: ChatMessage;
	};

	let { message }: Props = $props();

	const html = $derived(
		message.role === 'assistant' ? renderMarkdown(message.text) : ''
	);

	const hasTable = $derived(message.role === 'assistant' && /\|/.test(message.text) && /\n\|[-:\s|]+\|/.test(message.text));
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
		{:else}
			{message.text}
		{/if}
	</div>
</div>
