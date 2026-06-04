<script lang="ts">
	import type { ChatMessage, ToolActivity } from '$lib/chat/messages.js';
	import MessageBubble from '$lib/components/chat/MessageBubble.svelte';
	import PennyActivityStrip from '$lib/components/chat/PennyActivityStrip.svelte';
	import ThinkingPanel from '$lib/components/chat/ThinkingPanel.svelte';
	import { cn } from '$lib/utils.js';

	type Props = {
		statusHeadline: string;
		tools: ToolActivity[];
		researchTrace: string;
		traceExpanded: boolean;
		streamingMessage: ChatMessage | null;
		onToggleTrace: () => void;
	};

	let {
		statusHeadline,
		tools,
		researchTrace,
		traceExpanded,
		streamingMessage,
		onToggleTrace
	}: Props = $props();

	const answerStarted = $derived(streamingMessage !== null);
	const showResearchTrace = $derived(!answerStarted && researchTrace.trim().length > 0);
</script>

<div class="penny-active-turn w-full space-y-2">
	<div
		class={cn('penny-activity-wrap', answerStarted && 'penny-activity-wrap--exit')}
		aria-hidden={answerStarted}
	>
		<PennyActivityStrip {statusHeadline} {tools} busy={!answerStarted} />
	</div>

	{#if showResearchTrace}
		<ThinkingPanel
			text={researchTrace}
			expanded={traceExpanded}
			streaming={true}
			onToggle={onToggleTrace}
		/>
	{/if}

	{#if streamingMessage}
		<div class="penny-answer-enter">
			<MessageBubble message={streamingMessage} streaming={true} />
		</div>
	{/if}
</div>
