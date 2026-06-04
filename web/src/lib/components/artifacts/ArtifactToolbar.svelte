<script lang="ts">
	import { Download } from '@lucide/svelte';

	import type { ArtifactSummary } from '$lib/chat/artifacts.js';
	import { cn } from '$lib/utils.js';

	type Props = {
		artifact: ArtifactSummary;
		sessionKey: string;
	};

	let { artifact, sessionKey }: Props = $props();

	const downloadHref = $derived(
		`/api/artifacts/${artifact.artifactId}/download?sessionKey=${encodeURIComponent(sessionKey)}&format=pdf`
	);
</script>

<div class="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
	<div class="min-w-0">
		<p class="truncate text-sm font-semibold">{artifact.title}</p>
		<p class="text-xs text-muted-foreground">
			{artifact.programCount} program{artifact.programCount === 1 ? '' : 's'} · v{artifact.version}
		</p>
	</div>
		{#if artifact.pdfAvailable}
			<a
				href={downloadHref}
				class={cn(
					'inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium hover:bg-accent'
				)}
				download
			>
				<Download class="h-4 w-4" />
				Download PDF
			</a>
		{:else}
			<button
				type="button"
				class={cn(
					'inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-border bg-muted px-3 text-sm font-medium text-muted-foreground'
				)}
				disabled
			>
				<Download class="h-4 w-4" />
				PDF unavailable
			</button>
		{/if}
	</div>
