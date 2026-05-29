<script lang="ts">
	import { page } from '$app/state';
	import { PanelRight, Send, Square } from '@lucide/svelte';

	import { getPennyContext } from '$lib/chat/penny-context.js';
	import { sessionKeyFromRouteId } from '$lib/chat/session-routes.js';
	import ArtifactPanel from '$lib/components/artifacts/ArtifactPanel.svelte';
	import MessageBubble from '$lib/components/chat/MessageBubble.svelte';
	import ToolStrip from '$lib/components/chat/ToolStrip.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import Textarea from '$lib/components/ui/textarea.svelte';

	const { chat } = getPennyContext();
	let draft = $state('');
	let loadedRouteId = $state<string | null>(null);

	const routeId = $derived(page.params.id ?? '');

	$effect(() => {
		if (loadedRouteId === routeId) {
			return;
		}
		loadedRouteId = routeId;
		const sessionKey = sessionKeyFromRouteId(routeId);
		if (!sessionKey) {
			return;
		}
		void chat.switchSession(sessionKey);
	});

	async function handleSend() {
		const message = draft;
		draft = '';
		const sent = await chat.sendMessage(message);
		if (!sent) {
			draft = message;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			void handleSend();
		}
	}
</script>

<div class="flex min-h-0 flex-1 overflow-hidden">
	<div class="flex min-h-0 min-w-0 flex-1 flex-col px-4 py-6">
		<section
			class="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-1 flex-col gap-4 overflow-y-auto rounded-2xl border border-border bg-card/40 p-4"
		>
			{#if chat.state.loading}
				<p class="text-sm text-muted-foreground">Loading conversation…</p>
			{:else if chat.state.messages.length === 0}
				<div class="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
					Ask about grants, tax credits, or wage subsidies for <strong>this</strong> Canadian
					business. Each chat is a separate engagement — facts here won't mix with your other
					businesses.
				</div>
			{/if}

			{#each chat.state.messages as message (message.id)}
				<MessageBubble
					{message}
					artifacts={chat.state.artifacts}
					onOpenArtifact={(artifactId) => chat.openArtifact(artifactId)}
				/>
			{/each}

			<ToolStrip tools={chat.state.tools} />

			{#if chat.state.streamText}
				<MessageBubble message={{ id: 'stream', role: 'assistant', text: chat.state.streamText }} />
			{/if}
		</section>

		<form
			class="mx-auto mt-4 flex w-full max-w-3xl flex-col gap-3"
			onsubmit={(event) => {
				event.preventDefault();
				void handleSend();
			}}
		>
			<div class="flex items-center justify-end gap-2 lg:hidden">
				{#if chat.state.artifacts.length > 0}
					<Button
						variant="outline"
						type="button"
						onclick={() => {
							chat.state.artifactPanelOpen = true;
						}}
					>
						<PanelRight class="h-4 w-4" />
						Brief
					</Button>
				{/if}
			</div>
			<Textarea
				bind:value={draft}
				placeholder="Describe your business, jurisdiction, project, and timeline…"
				disabled={chat.state.sending || !chat.state.connected || chat.state.loading}
				onkeydown={handleKeydown}
			/>
			<div class="flex items-center justify-between gap-3">
				<p class="text-xs text-muted-foreground">Enter to send · Shift+Enter for newline</p>
				<div class="flex gap-2">
					{#if chat.state.sending}
						<Button variant="outline" type="button" onclick={() => void chat.abortActiveRun()}>
							<Square class="h-4 w-4" />
							Stop
						</Button>
					{/if}
					<Button
						type="submit"
						disabled={
							chat.state.sending ||
							chat.state.loading ||
							!chat.state.connected ||
							!draft.trim()
						}
					>
						<Send class="h-4 w-4" />
						Send
					</Button>
				</div>
			</div>
		</form>
	</div>

	<ArtifactPanel
		artifacts={chat.state.artifacts}
		activeArtifactId={chat.state.activeArtifactId}
		sessionKey={chat.state.sessionKey}
		mobileOpen={chat.state.artifactPanelOpen}
		onClose={() => chat.closeArtifactPanel()}
		onSelect={(artifactId) => chat.openArtifact(artifactId)}
	/>
</div>
