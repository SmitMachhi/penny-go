	<script lang="ts">
		import { ExternalLink } from '@lucide/svelte';

		import { loadPdfObjectUrl, type PdfObjectUrl } from '$lib/chat/pdf-preview.js';
		import { markPennyTiming } from '$lib/chat/performance-metrics.js';

		type Props = {
			artifactId: string;
			sessionKey: string;
		version: number;
		pdfAvailable: boolean;
	};

	let { artifactId, sessionKey, version, pdfAvailable }: Props = $props();

	let loadError = $state<string | null>(null);
	let previewReady = $state(false);
	let previewObjectUrl = $state<string | null>(null);

	const pdfUrl = $derived(
		`/api/artifacts/${artifactId}?sessionKey=${encodeURIComponent(sessionKey)}&preview=pdf&version=${version}`
	);

	$effect(() => {
		const url = pdfUrl;
		const available = pdfAvailable;
		let cancelled = false;
		let preview: PdfObjectUrl | null = null;

		loadError = null;
		previewReady = false;
		previewObjectUrl = null;

		if (!available || !artifactId || !sessionKey) {
			return;
		}

		void (async () => {
			try {
				const loadedPreview = await loadPdfObjectUrl({ url });
				if (cancelled) {
					loadedPreview.revoke();
					return;
				}
				preview = loadedPreview;
				previewObjectUrl = loadedPreview.objectUrl;
				previewReady = true;
				markPennyTiming('pdf_preview_ready');
			} catch {
				if (!cancelled) {
					loadError = 'Could not load PDF preview.';
					previewReady = false;
				}
			}
		})();

		return () => {
			cancelled = true;
			preview?.revoke();
			previewObjectUrl = null;
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
	{:else if previewObjectUrl}
		<div class="min-h-0 flex-1 overflow-hidden bg-white">
			<embed
				title="Funding memo preview"
				src="{previewObjectUrl}#view=FitH"
				type="application/pdf"
				class="block h-full w-full"
			/>
		</div>
	{/if}
</div>
