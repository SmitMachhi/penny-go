<script lang="ts">
	import { FileText } from '@lucide/svelte';

	import type { ArtifactSummary } from '$lib/chat/artifacts.js';
	import { artifactChipLabel } from '$lib/chat/artifacts.js';

	type Props = {
		artifact: ArtifactSummary;
		onOpenArtifact?: (artifactId: string) => void;
	};

	let { artifact, onOpenArtifact }: Props = $props();

	function handleOpen(event: MouseEvent): void {
		event.preventDefault();
		event.stopPropagation();
		onOpenArtifact?.(artifact.artifactId);
	}
</script>

<button
	type="button"
	class="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-lg border border-primary bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
	title={artifactChipLabel(artifact)}
	onclick={handleOpen}
>
	<FileText class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
	<span>Plan ready</span>
	<span class="font-medium text-primary-foreground/85">· View in panel</span>
</button>
