<script lang="ts">
	import { ExternalLink } from '@lucide/svelte';

	type Props = {
		artifactId: string;
		sessionKey: string;
		version: number;
		pdfAvailable: boolean;
	};

	let { artifactId, sessionKey, version, pdfAvailable }: Props = $props();

	let loadError = $state<string | null>(null);
	let previewReady = $state(false);

	const pdfUrl = $derived(
		`/api/artifacts/${artifactId}?sessionKey=${encodeURIComponent(sessionKey)}&preview=pdf&version=${version}`
	);

	$effect(() => {
		const url = pdfUrl;
		const available = pdfAvailable;
		let cancelled = false;

		loadError = null;
		previewReady = false;

		if (!available || !artifactId || !sessionKey) {
			return;
		}

		void (async () => {
			try {
				const response = await fetch(url, { credentials: 'same-origin' });
				if (!response.ok) {
					throw new Error(`pdf_fetch_${response.status}`);
				}
				const contentType = response.headers.get('content-type') ?? '';
				if (!contentType.includes('pdf')) {
					throw new Error('pdf_invalid_content_type');
				}
				const blob = await response.blob();
				if (cancelled || blob.size === 0) {
					throw new Error('pdf_empty');
				}
				if (!cancelled) {
					previewReady = true;
				}
			} catch {
				if (!cancelled) {
					loadError = 'Could not load PDF preview.';
					previewReady = false;
				}
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	function openInNewTab(): void {
		window.open(pdfUrl, '_blank', 'noopener,noreferrer');
	}
</script>

<div class="absolute inset-0 flex min-h-0 flex-col bg-muted/30">
	{#if !pdfAvailable}
		<div class="flex flex-1 items-center justify-center px-4 text-sm text-muted-foreground">
			PDF is still generating. Refresh in a moment or ask Penny to update the memo.
		</div>
	{:else if loadError}
		<div class="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center text-sm">
			<p class="text-destructive">{loadError}</p>
			<button
				type="button"
				class="inline-flex items-center gap-1.5 font-medium text-foreground underline underline-offset-2"
				onclick={openInNewTab}
			>
				<ExternalLink class="h-3.5 w-3.5" />
				Open PDF in new tab
			</button>
		</div>
	{:else if !previewReady}
		<div class="flex flex-1 items-center justify-center px-4 text-sm text-muted-foreground">
			Loading memo…
		</div>
	{:else}
		<div class="flex shrink-0 items-center justify-end gap-2 border-b border-border/60 px-3 py-1.5">
			<button
				type="button"
				class="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
				onclick={openInNewTab}
			>
				<ExternalLink class="h-3 w-3" />
				Open in new tab
			</button>
		</div>
		<div class="min-h-0 flex-1 overflow-hidden bg-white">
			<embed
				title="Funding memo preview"
				src="{pdfUrl}#view=FitH"
				type="application/pdf"
				class="block h-full w-full"
			/>
		</div>
	{/if}
</div>
