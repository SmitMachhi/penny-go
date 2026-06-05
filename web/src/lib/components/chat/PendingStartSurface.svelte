<script lang="ts">
	import ConversationSkeleton from '$lib/components/chat/ConversationSkeleton.svelte';

	type Props = {
		message: string;
	};

	let { message }: Props = $props();
</script>

<main class="penny-canvas-surface flex flex-1 flex-col justify-end py-6">
	<div class="penny-chat-column w-full space-y-7">
		<div class="flex justify-end">
			<div
				class="penny-user-bubble max-w-[85%] rounded-[1.25rem] px-4 py-2.5 text-[0.9375rem] leading-relaxed whitespace-pre-wrap"
			>
				{message}
			</div>
		</div>
		<div class="space-y-3">
			<div class="flex items-center gap-2 text-sm text-muted-foreground">
				<img class="h-5 w-5 rounded-md" src="/penny-icon.png" alt="" width="20" height="20" />
				<span>Opening workspace</span>
			</div>
			<ConversationSkeleton />
		</div>
	</div>
</main>
