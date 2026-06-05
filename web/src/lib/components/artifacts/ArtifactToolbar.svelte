<script lang="ts">
	import { Download, X } from '@lucide/svelte';

	import { downloadArtifactPdf } from '$lib/chat/artifact-download.js';
	import type { ArtifactSummary, ArtifactVersionSummary } from '$lib/chat/artifacts.js';
	import ArtifactVersionSelect from '$lib/components/artifacts/ArtifactVersionSelect.svelte';
	import { cn } from '$lib/utils.js';

	type Props = {
		artifact: ArtifactSummary;
		sessionKey: string;
		versions: ArtifactVersionSummary[];
		selectedVersion: number;
		pdfAvailable: boolean;
		updateNotice: string | null;
		detailLoading: boolean;
		onSelectVersion: (version: number) => void;
		onClose: () => void;
	};

	let {
		artifact,
		sessionKey,
		versions,
		selectedVersion,
		pdfAvailable,
		updateNotice,
		detailLoading,
		onSelectVersion,
		onClose
	}: Props = $props();

	let downloading = $state(false);

	const downloadHref = $derived(
		`/api/artifacts/${artifact.artifactId}/download?sessionKey=${encodeURIComponent(sessionKey)}&format=pdf&version=${selectedVersion}`
	);

	async function handleDownload(): Promise<void> {
		if (downloading || !pdfAvailable) {
			return;
		}
		downloading = true;
		try {
			await downloadArtifactPdf(downloadHref, artifact.title, selectedVersion);
		} finally {
			downloading = false;
		}
	}
</script>

<div class="space-y-3 border-b border-border px-4 py-3">
	<div class="flex items-start justify-between gap-2">
		<div class="min-w-0 flex-1">
			<p class="truncate text-sm font-semibold">{artifact.title}</p>
			<p class="text-xs text-muted-foreground">
				{artifact.programCount} program{artifact.programCount === 1 ? '' : 's'} · v{selectedVersion}
				{#if detailLoading}
					<span class="text-muted-foreground/80"> · syncing versions…</span>
				{/if}
			</p>
			{#if updateNotice}
				<p class="mt-1 text-xs font-medium text-primary">{updateNotice}</p>
			{/if}
		</div>
		<div class="flex shrink-0 items-center gap-1.5">
			{#if pdfAvailable}
				<button
					type="button"
					class={cn(
						'inline-flex h-9 items-center gap-2 rounded-lg border border-primary bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60'
					)}
					disabled={downloading}
					onclick={() => void handleDownload()}
				>
					<Download class="h-4 w-4" />
					<span class="hidden sm:inline">{downloading ? 'Downloading…' : 'Download'}</span>
				</button>
			{:else}
				<button
					type="button"
					class={cn(
						'inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-muted px-3 text-sm font-medium text-muted-foreground'
					)}
					disabled
				>
					<Download class="h-4 w-4" />
					<span class="hidden sm:inline">PDF unavailable</span>
				</button>
			{/if}
			<button
				type="button"
				class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
				aria-label="Close funding plan panel"
				onclick={onClose}
			>
				<X class="h-4 w-4" />
			</button>
		</div>
	</div>

	<ArtifactVersionSelect {versions} {selectedVersion} onSelect={onSelectVersion} />
</div>
