<script lang="ts">
	import type { ChatMessage, ToolActivity } from '$lib/chat/messages.js';
	import EvidenceQuest from '$lib/components/chat/EvidenceQuest.svelte';
	import MessageBubble from '$lib/components/chat/MessageBubble.svelte';

	type Props = {
		tools: ToolActivity[];
		streamingMessage: ChatMessage | null;
		onOpenArtifact?: (artifactId: string) => void;
	};

	let {
		tools,
		streamingMessage,
		onOpenArtifact
	}: Props = $props();

	const answerStarted = $derived(streamingMessage !== null);
</script>

<div class="penny-active-turn w-full space-y-2">
	<EvidenceQuest {tools} {answerStarted} />

	{#if streamingMessage}
		<div class="penny-answer-enter">
			<MessageBubble message={streamingMessage} streaming={true} {onOpenArtifact} />
		</div>
	{/if}
</div>
