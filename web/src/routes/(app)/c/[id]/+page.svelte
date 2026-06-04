<script lang="ts">
	const chatView = import('$lib/components/chat/ChatView.svelte');
</script>

{#await chatView then module}
	{@const ChatView = module.default}
	<ChatView />
{/await}
