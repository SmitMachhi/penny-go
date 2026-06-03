<script lang="ts">
	import { page } from '$app/state';
	import { tick } from 'svelte';

	import {
		isThreadNearBottom,
		scrollThreadToBottom
	} from '$lib/chat/chat-thread-scroll.js';
	import { getPennyContext } from '$lib/chat/penny-context.js';
	import { liveRunTraceText } from '$lib/chat/client-run-trace.js';
	import {
		CANVAS_EMPTY_HEADLINE,
		CANVAS_EMPTY_SUBHEAD
	} from '$lib/chat/starter-prompts.js';
	import { messagesForDisplay } from '$lib/chat/display-messages.js';
	import { sessionKeyFromRouteId } from '$lib/chat/session-routes.js';
	import ArtifactPanel from '$lib/components/artifacts/ArtifactPanel.svelte';
	import ChatComposer from '$lib/components/chat/ChatComposer.svelte';
	import MessageBubble from '$lib/components/chat/MessageBubble.svelte';
	import StarterPromptChips from '$lib/components/chat/StarterPromptChips.svelte';
	import ThinkingPanel from '$lib/components/chat/ThinkingPanel.svelte';

	const { chat, sessions } = getPennyContext();
	let draft = $state('');
	let loadedRouteId = $state<string | null>(null);
	let threadEl = $state<HTMLElement | undefined>(undefined);
	let followThread = $state(false);
	let suppressScrollPinUpdate = $state(false);

	const routeId = $derived(page.params.id ?? '');
	const displayMessages = $derived(messagesForDisplay(chat.state.messages, chat.state.sending));

	const inputDisabled = $derived(!chat.state.connected);
	const sendDisabled = $derived(
		chat.state.sending || !chat.state.connected || chat.state.loading
	);
	const liveTraceText = $derived(liveRunTraceText(chat.state.runTrace));

	async function pinThreadToBottom(behavior: ScrollBehavior = 'smooth'): Promise<void> {
		followThread = true;
		await tick();
		if (!threadEl) {
			return;
		}
		suppressScrollPinUpdate = true;
		scrollThreadToBottom(threadEl, behavior);
		await tick();
		suppressScrollPinUpdate = false;
	}

	function handleThreadScroll(): void {
		if (suppressScrollPinUpdate || !threadEl) {
			return;
		}
		followThread = isThreadNearBottom(threadEl);
	}

	$effect(() => {
		if (!followThread || !threadEl) {
			return;
		}
		void displayMessages.length;
		void chat.state.sending;
		void liveTraceText;
		void chat.state.tools.length;
		void chat.state.runTraceExpanded;

		void tick().then(() => {
			if (!followThread || !threadEl) {
				return;
			}
			suppressScrollPinUpdate = true;
			scrollThreadToBottom(threadEl, 'auto');
			suppressScrollPinUpdate = false;
		});
	});

	$effect(() => {
		if (loadedRouteId === routeId) {
			return;
		}
		loadedRouteId = routeId;
		followThread = false;
		const sessionKey = sessionKeyFromRouteId(routeId);
		if (!sessionKey) {
			return;
		}
		void chat.switchSession(sessionKey);
	});

	async function handleSend() {
		if (sendDisabled) {
			return;
		}
		const message = draft;
		const trimmed = message.trim();
		const isFirstMessage = chat.state.messages.length === 0;
		draft = '';
		followThread = true;
		const sent = await chat.sendMessage(message);
		if (!sent) {
			draft = message;
			followThread = threadEl ? isThreadNearBottom(threadEl) : false;
			return;
		}
		await pinThreadToBottom('smooth');
		if (isFirstMessage && chat.state.sessionKey && trimmed) {
			sessions.setTitleFromFirstMessage(chat.state.sessionKey, trimmed);
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey && !sendDisabled) {
			event.preventDefault();
			void handleSend();
		}
	}

	function applyStarterPrompt(prompt: string): void {
		draft = prompt;
	}
</script>

<div class="penny-chat-bg flex min-h-0 flex-1 overflow-hidden">
	<div class="penny-chat-workspace">
		<div class="relative flex min-h-0 min-w-0 flex-1 flex-col">
			<section
				bind:this={threadEl}
				class="penny-chat-column penny-overlay-scroll flex min-h-0 flex-1 flex-col overflow-y-auto pt-6"
				style="gap: var(--penny-thread-gap)"
				onscroll={handleThreadScroll}
			>
				{#if chat.state.loading}
					<p class="text-[0.9375rem] text-muted-foreground">Loading conversation…</p>
				{:else if chat.state.messages.length === 0}
					<div class="space-y-6 py-8 text-center">
						<div class="space-y-2">
							<h2 class="text-2xl font-semibold tracking-tight text-foreground">
								{CANVAS_EMPTY_HEADLINE}
							</h2>
							<p class="text-[0.9375rem] leading-relaxed text-muted-foreground">
								{CANVAS_EMPTY_SUBHEAD}
							</p>
						</div>
						<StarterPromptChips disabled={sendDisabled} onSelect={applyStarterPrompt} />
					</div>
				{/if}

				{#each displayMessages as message (message.id)}
					{#if message.thinkingTrace && !chat.state.sending}
						<ThinkingPanel text={message.thinkingTrace} />
					{/if}
					<MessageBubble
						{message}
						artifacts={chat.state.artifacts}
						onOpenArtifact={(artifactId) => chat.openArtifact(artifactId)}
					/>
				{/each}

				{#if chat.state.sending}
					<ThinkingPanel
						text={liveTraceText}
						tools={chat.state.tools}
						expanded={chat.state.runTraceExpanded}
						streaming={true}
						onToggle={() => {
							chat.state.runTraceExpanded = !chat.state.runTraceExpanded;
						}}
					/>
				{/if}
			</section>

			<div class="penny-composer-dock">
				<ChatComposer
					bind:draft
					disabled={inputDisabled}
					sendDisabled={sendDisabled}
					sending={chat.state.sending}
					onSubmit={() => void handleSend()}
					onStop={() => void chat.abortActiveRun()}
					onKeydown={handleKeydown}
				/>
			</div>
		</div>

		<ArtifactPanel
			artifacts={chat.state.artifacts}
			activeArtifactId={chat.state.activeArtifactId}
			sessionKey={chat.state.sessionKey}
			open={chat.state.artifactPanelOpen}
			onClose={() => chat.closeArtifactPanel()}
			onSelect={(artifactId) => chat.openArtifact(artifactId)}
		/>
	</div>
</div>
