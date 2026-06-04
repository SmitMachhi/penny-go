<script lang="ts">
	import { onDestroy } from 'svelte';

	import { ChatClient } from '$lib/chat/client.svelte.js';
	import { clearPennyContextForTests, setPennyContext } from '$lib/chat/penny-context.js';
	import { SessionClient } from '$lib/chat/sessions.svelte.js';

	type Props = {
		children: import('svelte').Snippet;
	};

	let { children }: Props = $props();

	const chat = new ChatClient();
	const sessions = new SessionClient();

	setPennyContext({ chat, sessions });

	onDestroy(() => {
		chat.stopHealthPolling();
		chat.dispose();
		clearPennyContextForTests();
	});
</script>

{@render children?.()}
