<script lang="ts">
	import { cn } from '$lib/utils.js';

	type Props = {
		artifactId: string;
		sessionKey: string;
		pdfAvailable: boolean;
	};

	let { artifactId, sessionKey, pdfAvailable }: Props = $props();

	let pageUrls = $state<string[]>([]);
	let loading = $state(true);
	let loadError = $state<string | null>(null);

	const pdfUrl = $derived(
		`/api/artifacts/${artifactId}?sessionKey=${encodeURIComponent(sessionKey)}&preview=pdf`
	);

	$effect(() => {
		const url = pdfUrl;
		let cancelled = false;

		loading = true;
		loadError = null;
		pageUrls = [];

		if (!pdfAvailable) {
			loading = false;
			return;
		}

		void (async () => {
			try {
				const pdfjs = await import('pdfjs-dist');
				const workerModule = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
				pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;

				const pdfDocument = await pdfjs.getDocument(url).promise;
				const renderedPages: string[] = [];

				for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
					if (cancelled) {
						return;
					}

					const page = await pdfDocument.getPage(pageNumber);
					const viewport = page.getViewport({ scale: 1.35 });
					const canvas = window.document.createElement('canvas');
					const context = canvas.getContext('2d');

					if (!context) {
						throw new Error('canvas_context_unavailable');
					}

					canvas.width = viewport.width;
					canvas.height = viewport.height;

					await page.render({ canvas, canvasContext: context, viewport }).promise;
					renderedPages.push(canvas.toDataURL('image/png'));
				}

				if (!cancelled) {
					pageUrls = renderedPages;
				}
			} catch (error) {
				if (!cancelled) {
					loadError = error instanceof Error ? error.message : 'Failed to load PDF preview';
				}
			} finally {
				if (!cancelled) {
					loading = false;
				}
			}
		})();

		return () => {
			cancelled = true;
		};
	});
</script>

<div class="absolute inset-0 overflow-y-auto bg-muted/30">
	{#if loading}
		<div class="flex h-full items-center justify-center px-4 text-sm text-muted-foreground">
			Loading PDF…
		</div>
	{:else if loadError}
		<div class="flex h-full items-center justify-center px-4 text-center text-sm text-destructive">
			{loadError}
		</div>
	{:else if pageUrls.length === 0}
		<div class="flex h-full items-center justify-center px-4 text-sm text-muted-foreground">
				PDF unavailable.
			</div>
	{:else}
		<div class="flex flex-col items-center gap-4 p-4">
			{#each pageUrls as pageUrl, index (index)}
				<img
					src={pageUrl}
					alt={`Page ${index + 1}`}
					class={cn('w-full max-w-full rounded-md border border-border bg-white shadow-sm')}
					loading="lazy"
				/>
			{/each}
		</div>
	{/if}
</div>
