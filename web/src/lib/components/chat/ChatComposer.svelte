<script lang="ts">
	import { tick } from 'svelte';
	import { ArrowUp, Square } from '@lucide/svelte';

	import { syncTextareaHeight } from '$lib/components/chat/auto-resize-textarea.js';
	import { CHAT_DISCLAIMER, CHAT_PLACEHOLDER } from '$lib/chat/starter-prompts.js';
	import { cn } from '$lib/utils.js';

	type Props = {
		draft?: string;
		disabled?: boolean;
		sendDisabled?: boolean;
		sending?: boolean;
		showDisclaimer?: boolean;
		onSubmit: () => void;
		onStop?: () => void;
		onKeydown?: (event: KeyboardEvent) => void;
	};

	let {
		draft = $bindable(''),
		disabled = false,
		sendDisabled = false,
		sending = false,
		showDisclaimer = false,
		onSubmit,
		onStop,
		onKeydown
	}: Props = $props();

	const canSend = $derived(!sendDisabled && draft.trim().length > 0);

	let textareaEl = $state<HTMLTextAreaElement | null>(null);

	async function refreshTextareaHeight(): Promise<void> {
		await tick();
		if (textareaEl) {
			syncTextareaHeight(textareaEl);
		}
	}

	$effect(() => {
		draft;
		void refreshTextareaHeight();
	});
</script>

<form
	class="penny-chat-column w-full"
	onsubmit={(event) => {
		event.preventDefault();
		onSubmit();
	}}
>
	<div
		class="flex items-end gap-2 rounded-[1.75rem] border border-border bg-background px-3 py-2 transition-[border-color,box-shadow] focus-within:border-primary/45 focus-within:ring-2 focus-within:ring-primary/15"
	>
		<textarea
			bind:this={textareaEl}
			bind:value={draft}
			placeholder={CHAT_PLACEHOLDER}
			{disabled}
			rows={1}
			oninput={() => void refreshTextareaHeight()}
			onkeydown={onKeydown}
			class={cn(
				'penny-overlay-scroll max-h-52 min-h-[2.75rem] flex-1 resize-none border-0 bg-transparent py-2.5',
				'text-base leading-relaxed outline-none placeholder:text-muted-foreground/80'
			)}
		></textarea>
		<div class="flex shrink-0 items-center pb-0.5">
			{#if sending}
				<button
					type="button"
					class="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
					aria-label="Stop response"
					onclick={() => onStop?.()}
				>
					<Square class="h-4 w-4 fill-current" />
				</button>
			{:else}
				<button
					type="submit"
					class="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-25"
					disabled={!canSend}
					aria-label="Send message"
				>
					<ArrowUp class="h-5 w-5" strokeWidth={2.25} />
				</button>
			{/if}
		</div>
	</div>
	{#if showDisclaimer}
		<p class="mt-2 text-center text-xs text-muted-foreground/80">{CHAT_DISCLAIMER}</p>
	{/if}
</form>
