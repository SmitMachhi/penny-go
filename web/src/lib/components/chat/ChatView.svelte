<script lang="ts">
	import { page } from '$app/state';
	import { onMount, tick } from 'svelte';

	import {
		clampArtifactPanelWidth,
		readStoredArtifactPanelWidth,
		storeArtifactPanelWidth
	} from '$lib/chat/artifact-panel-layout.js';

	import {
		isThreadNearBottom,
		resolveThreadBottomSpacerHeightPx,
		scrollThreadToBottom,
		scrollThreadToWorkingAnchor
	} from '$lib/chat/chat-thread-scroll.js';
	import { getPennyContext } from '$lib/chat/penny-context.js';
	import {
		extractRunStatusHeadline,
		researchTraceText
	} from '$lib/chat/run-status-headline.js';
	import {
		CHAT_AWAITING_REPLY_HEADLINE,
		CHAT_AWAITING_REPLY_SUBHEAD,
		CHAT_EMPTY_THREAD_SUBHEAD
	} from '$lib/chat/thread-empty-copy.js';
	import type { ArtifactSummary } from '$lib/chat/artifacts.js';
	import type { ChatMessage } from '$lib/chat/messages.js';
	import {
		findLastAssistantMessageId,
		messagesForDisplay
	} from '$lib/chat/display-messages.js';
	import { sanitizeAssistantDisplayText } from '$lib/chat/sanitize-assistant-text.js';
	import {
		clearPendingFirstMessage,
		peekPendingFirstMessage
	} from '$lib/chat/pending-first-message.js';
	import { isPendingFirstMessageRouteCurrent } from '$lib/chat/pending-first-message-route.js';
	import { sessionKeyFromRouteId } from '$lib/chat/session-routes.js';
	import ArtifactPanel from '$lib/components/artifacts/ArtifactPanel.svelte';
	import ChatComposer from '$lib/components/chat/ChatComposer.svelte';
	import MessageBubble from '$lib/components/chat/MessageBubble.svelte';
	import PennyActiveTurn from '$lib/components/chat/PennyActiveTurn.svelte';
	import ThinkingPanel from '$lib/components/chat/ThinkingPanel.svelte';

	const { chat, sessions } = getPennyContext();
	let draft = $state('');
	let loadedRouteId = $state<string | null>(null);
	let threadEl = $state<HTMLElement | undefined>(undefined);
	let workingAnchorEl = $state<HTMLElement | undefined>(undefined);
	let followThread = $state(false);
	let suppressScrollPinUpdate = $state(false);
	let artifactPanelWidthPx = $state(520);

	const ARTIFACT_PANEL_KEYBOARD_RESIZE_STEP_PX = 24;

	const showArtifactPanelChrome = $derived(
		chat.state.artifactPanelOpen &&
			(chat.state.activeArtifactId !== null || chat.state.artifacts.length > 0)
	);

	onMount(() => {
		artifactPanelWidthPx = readStoredArtifactPanelWidth(window.innerWidth);
	});

	function startArtifactPanelResize(event: PointerEvent): void {
		event.preventDefault();
		const startX = event.clientX;
		const startWidth = artifactPanelWidthPx;
		const handle = event.currentTarget;
		if (!(handle instanceof HTMLElement)) {
			return;
		}

		handle.setPointerCapture(event.pointerId);

		const onMove = (moveEvent: PointerEvent) => {
			const deltaPx = startX - moveEvent.clientX;
			artifactPanelWidthPx = clampArtifactPanelWidth(
				startWidth + deltaPx,
				window.innerWidth
			);
		};

		const onUp = () => {
			handle.releasePointerCapture(event.pointerId);
			handle.removeEventListener('pointermove', onMove);
			handle.removeEventListener('pointerup', onUp);
			storeArtifactPanelWidth(artifactPanelWidthPx, window.innerWidth);
		};

		handle.addEventListener('pointermove', onMove);
		handle.addEventListener('pointerup', onUp);
	}

	function handleArtifactPanelResizeKeydown(event: KeyboardEvent): void {
		let deltaPx = 0;
		if (event.key === 'ArrowLeft') {
			deltaPx = ARTIFACT_PANEL_KEYBOARD_RESIZE_STEP_PX;
		}
		if (event.key === 'ArrowRight') {
			deltaPx = -ARTIFACT_PANEL_KEYBOARD_RESIZE_STEP_PX;
		}
		if (deltaPx === 0) {
			return;
		}
		event.preventDefault();
		artifactPanelWidthPx = clampArtifactPanelWidth(
			artifactPanelWidthPx + deltaPx,
			window.innerWidth
		);
		storeArtifactPanelWidth(artifactPanelWidthPx, window.innerWidth);
	}

	const routeId = $derived(page.params.id ?? '');
	const displayMessages = $derived(messagesForDisplay(chat.state.messages, chat.state.sending));

	const inputDisabled = $derived(!chat.state.connected);
	const sendDisabled = $derived(chat.state.sending || !chat.state.connected);
	const showThreadLoading = $derived(
		chat.state.loading && chat.state.messages.length === 0 && !chat.state.sending
	);
	const showAwaitingReply = $derived(chat.state.messages.length === 0 && chat.state.sending);
	const showEmptyThread = $derived(
		chat.state.messages.length === 0 && !chat.state.sending && !chat.state.loading
	);
	const liveStatusHeadline = $derived(
		extractRunStatusHeadline(chat.state.runTrace, chat.state.tools)
	);
	const liveResearchTrace = $derived(
		researchTraceText(chat.state.runTrace, chat.state.streamingAnswerText)
	);
	const streamingAssistantMessage = $derived.by((): ChatMessage | null => {
		const text = sanitizeAssistantDisplayText(chat.state.streamingAnswerText.trim());
		if (!chat.state.sending || !text) {
			return null;
		}
		return { id: 'streaming-assistant', role: 'assistant', text };
	});
	const latestArtifact = $derived(chat.state.artifacts[0] ?? null);
	const lastAssistantMessageId = $derived(findLastAssistantMessageId(displayMessages));
	const showPlanNudge = $derived(
		latestArtifact !== null &&
			!chat.state.artifactPanelOpen &&
			lastAssistantMessageId !== null
	);

	const threadBottomSpacerHeightPx = $derived(
		resolveThreadBottomSpacerHeightPx({ sending: chat.state.sending })
	);

	function planNudgeForMessage(message: ChatMessage): ArtifactSummary | null {
		if (!showPlanNudge || message.id !== lastAssistantMessageId || !latestArtifact) {
			return null;
		}
		const linked = (message.artifactIds ?? [])
			.map((artifactId) =>
				chat.state.artifacts.find((artifact) => artifact.artifactId === artifactId)
			)
			.filter((artifact): artifact is ArtifactSummary => artifact !== undefined);
		return linked[0] ?? latestArtifact;
	}

	async function pinThreadToBottom(behavior: ScrollBehavior = 'smooth'): Promise<void> {
		followThread = true;
		await tick();
		if (!threadEl) {
			return;
		}
		suppressScrollPinUpdate = true;
		if (chat.state.sending && workingAnchorEl) {
			scrollThreadToWorkingAnchor(threadEl, workingAnchorEl, behavior);
		} else {
			scrollThreadToBottom(threadEl, behavior);
		}
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
		void threadBottomSpacerHeightPx;
		void liveStatusHeadline;
		void chat.state.streamingAnswerText;
		void chat.state.tools.length;
		void chat.state.runTraceExpanded;

		void tick().then(() => {
			if (!followThread || !threadEl) {
				return;
			}
			suppressScrollPinUpdate = true;
			if (chat.state.sending && workingAnchorEl) {
				scrollThreadToWorkingAnchor(threadEl, workingAnchorEl, 'auto');
			} else {
				scrollThreadToBottom(threadEl, 'auto');
			}
			suppressScrollPinUpdate = false;
		});
	});

	$effect(() => {
		const key = chat.state.sessionKey;
		if (key && routeId && chat.state.artifacts.length === 0 && !chat.state.loading) {
			void chat.loadArtifacts();
		}
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
			const targetRouteId = routeId;
			void (async () => {
				await chat.switchSession(sessionKey);
				if (
					!isPendingFirstMessageRouteCurrent({
						loadedRouteId,
						targetRouteId,
						currentRouteId: routeId,
						currentSessionKey: chat.state.sessionKey,
						targetSessionKey: sessionKey
					})
				) {
					return;
				}
				const pending = peekPendingFirstMessage(sessionKey);
			if (!pending || chat.state.sending) {
				return;
			}
			followThread = true;
			const sent = await chat.sendMessage(pending, { skipHistoryReload: true });
			if (sent) {
				clearPendingFirstMessage();
				sessions.setTitleFromFirstMessage(sessionKey, pending);
				await pinThreadToBottom('smooth');
			}
		})();
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
				{#if showThreadLoading}
					<p class="text-[0.9375rem] text-muted-foreground">Loading conversation…</p>
				{:else if showAwaitingReply}
					<div class="space-y-2 py-8 text-center">
						<h2 class="font-display text-2xl font-semibold tracking-tight text-foreground">
							{CHAT_AWAITING_REPLY_HEADLINE}
						</h2>
						<p class="text-[0.9375rem] leading-relaxed text-muted-foreground">
							{CHAT_AWAITING_REPLY_SUBHEAD}
						</p>
					</div>
				{:else if showEmptyThread}
					<p class="py-8 text-center text-[0.9375rem] text-muted-foreground">
						{CHAT_EMPTY_THREAD_SUBHEAD}
					</p>
				{/if}

				{#each displayMessages as message (message.id)}
					{#if message.thinkingTrace && !chat.state.sending}
						<ThinkingPanel text={message.thinkingTrace} />
					{/if}
					<MessageBubble
						{message}
						planNudgeArtifact={planNudgeForMessage(message)}
						onOpenArtifact={(artifactId) => chat.openArtifact(artifactId)}
					/>
				{/each}

				{#if chat.state.sending}
					<div bind:this={workingAnchorEl} class="penny-turn-focus-anchor w-full">
						<PennyActiveTurn
							statusHeadline={liveStatusHeadline}
							tools={chat.state.tools}
							researchTrace={liveResearchTrace}
							traceExpanded={chat.state.runTraceExpanded}
							streamingMessage={streamingAssistantMessage}
							onOpenArtifact={(artifactId) => chat.openArtifact(artifactId)}
							onToggleTrace={() => {
								chat.state.runTraceExpanded = !chat.state.runTraceExpanded;
							}}
						/>
					</div>
				{/if}

				<div
					class="shrink-0"
					aria-hidden="true"
					style:height="{threadBottomSpacerHeightPx}px"
				></div>
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

	{#if showArtifactPanelChrome}
		<button
			type="button"
			aria-label="Resize funding plan panel"
			class="artifact-panel-resizer hidden shrink-0 lg:block"
			onpointerdown={startArtifactPanelResize}
			onkeydown={handleArtifactPanelResizeKeydown}
		></button>
	{/if}

		<ArtifactPanel
			artifacts={chat.state.artifacts}
			activeArtifactId={chat.state.activeArtifactId}
			sessionKey={chat.state.sessionKey}
			open={chat.state.artifactPanelOpen}
			widthPx={artifactPanelWidthPx}
			onClose={() => chat.closeArtifactPanel()}
			onSelect={(artifactId) => chat.openArtifact(artifactId)}
		/>
	</div>
</div>
