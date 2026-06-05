	<script lang="ts">
		import { ExternalLink, ZoomIn, ZoomOut } from '@lucide/svelte';

		import {
			buildPdfPreviewSource,
			clampPdfPreviewPage,
			clampPdfPreviewZoom,
			PDF_PREVIEW_DEFAULT_ZOOM_PERCENT,
			PDF_PREVIEW_INITIAL_PAGE,
			PDF_PREVIEW_MAX_ZOOM_PERCENT,
			PDF_PREVIEW_MIN_ZOOM_PERCENT,
			PDF_PREVIEW_ZOOM_STEP_PERCENT
		} from '$lib/chat/pdf-preview-controls.js';
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
	let previewPage = $state(PDF_PREVIEW_INITIAL_PAGE);
	let previewZoomPercent = $state(PDF_PREVIEW_DEFAULT_ZOOM_PERCENT);

	const pdfUrl = $derived(
		`/api/artifacts/${artifactId}?sessionKey=${encodeURIComponent(sessionKey)}&preview=pdf&version=${version}`
	);
	const previewEmbedSrc = $derived(
		previewObjectUrl
			? buildPdfPreviewSource({
					objectUrl: previewObjectUrl,
					page: previewPage,
					zoomPercent: previewZoomPercent
				})
			: null
	);

	$effect(() => {
		const url = pdfUrl;
		const available = pdfAvailable;
		let cancelled = false;
		let preview: PdfObjectUrl | null = null;

		loadError = null;
		previewReady = false;
		previewObjectUrl = null;
		previewPage = PDF_PREVIEW_INITIAL_PAGE;
		previewZoomPercent = PDF_PREVIEW_DEFAULT_ZOOM_PERCENT;

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

	function handlePageInput(event: Event): void {
		if (!(event.currentTarget instanceof HTMLInputElement)) {
			return;
		}
		previewPage = clampPdfPreviewPage(Number(event.currentTarget.value));
	}

	function zoomOut(): void {
		previewZoomPercent = clampPdfPreviewZoom(
			previewZoomPercent - PDF_PREVIEW_ZOOM_STEP_PERCENT
		);
	}

	function zoomIn(): void {
		previewZoomPercent = clampPdfPreviewZoom(
			previewZoomPercent + PDF_PREVIEW_ZOOM_STEP_PERCENT
		);
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
	{:else if previewEmbedSrc}
		<div class="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
			<div
				class="flex h-10 shrink-0 items-center justify-between border-b border-border/60 bg-card px-3 text-xs text-muted-foreground"
			>
				<div class="flex items-center gap-2">
					<span class="font-medium text-foreground">Page</span>
					<input
						type="number"
						min={PDF_PREVIEW_INITIAL_PAGE}
						value={previewPage}
						aria-label="PDF page number"
						class="h-7 w-14 rounded-md border border-border bg-background px-2 text-center text-xs font-medium text-foreground"
						oninput={handlePageInput}
					/>
				</div>
				<div class="flex items-center gap-1.5">
					<button
						type="button"
						class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
						aria-label="Zoom out"
						disabled={previewZoomPercent <= PDF_PREVIEW_MIN_ZOOM_PERCENT}
						onclick={zoomOut}
					>
						<ZoomOut class="h-3.5 w-3.5" />
					</button>
					<span class="w-10 text-center font-medium text-foreground">{previewZoomPercent}%</span>
					<button
						type="button"
						class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
						aria-label="Zoom in"
						disabled={previewZoomPercent >= PDF_PREVIEW_MAX_ZOOM_PERCENT}
						onclick={zoomIn}
					>
						<ZoomIn class="h-3.5 w-3.5" />
					</button>
				</div>
			</div>
			<embed
				title="Funding memo preview"
				src={previewEmbedSrc}
				type="application/pdf"
				class="block min-h-0 flex-1"
			/>
		</div>
	{/if}
</div>
