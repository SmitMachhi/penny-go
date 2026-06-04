<script lang="ts">
	import type { ChatMessage, ToolActivity } from '$lib/chat/messages.js';
	import MessageBubble from '$lib/components/chat/MessageBubble.svelte';
	import ThinkingPanel from '$lib/components/chat/ThinkingPanel.svelte';

	type Props = {
		statusHeadline: string;
		tools: ToolActivity[];
		researchTrace: string;
		traceExpanded: boolean;
		streamingMessage: ChatMessage | null;
		onOpenArtifact?: (artifactId: string) => void;
		onToggleTrace: () => void;
	};

	let {
		statusHeadline,
		tools,
		researchTrace,
		traceExpanded,
		streamingMessage,
		onOpenArtifact,
		onToggleTrace
	}: Props = $props();

	const answerStarted = $derived(streamingMessage !== null);
</script>

<div class="penny-active-turn w-full space-y-2">
	<ThinkingPanel
		text={researchTrace}
		{tools}
		{statusHeadline}
		expanded={traceExpanded}
		streaming={true}
		hideStatus={answerStarted}
		onToggle={onToggleTrace}
	/>

	{#if streamingMessage}
		<div class="penny-answer-enter">
			<MessageBubble message={streamingMessage} streaming={true} {onOpenArtifact} />
		</div>
	{/if}
</div>
