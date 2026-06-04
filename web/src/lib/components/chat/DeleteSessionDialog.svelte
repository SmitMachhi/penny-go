<script lang="ts">
	type Props = {
		open: boolean;
		onConfirm: () => void;
		onCancel: () => void;
	};

	let { open, onConfirm, onCancel }: Props = $props();
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="delete-session-title"
			class="w-full max-w-md rounded-2xl border border-border bg-card p-6"
		>
			<h2 id="delete-session-title" class="text-lg font-semibold">Delete this chat?</h2>
			<p class="mt-2 text-sm text-muted-foreground">
				This permanently deletes the chat and cannot be undone.
			</p>
			<div class="mt-6 flex justify-end gap-2">
				<button
					type="button"
					class="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
					onclick={onCancel}
				>
					Cancel
				</button>
				<button
					type="button"
					class="rounded-lg bg-destructive px-4 py-2 text-sm text-white hover:opacity-90"
					onclick={onConfirm}
				>
					Delete
				</button>
			</div>
		</div>
	</div>
{/if}
