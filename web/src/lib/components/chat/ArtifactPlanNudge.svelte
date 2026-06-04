<script lang="ts">
	import { FileText } from '@lucide/svelte';

	import type { ArtifactSummary } from '$lib/chat/artifacts.js';
	import { artifactChipLabel } from '$lib/chat/artifacts.js';
	import { getPennyContext } from '$lib/chat/penny-context.js';

	type Props = {
		artifact: ArtifactSummary;
	};

	let { artifact }: Props = $props();

	const { chat } = getPennyContext();

	function handleOpen(event: MouseEvent): void {
		event.preventDefault();
		event.stopPropagation();
		chat.openArtifact(artifact.artifactId);
	}
</script>

<button
	type="button"
	class="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-lg border border-primary/25 bg-background px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
	title={artifactChipLabel(artifact)}
	onclick={handleOpen}
>
	<FileText class="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
	<span>Funding plan ready</span>
	<span class="font-medium text-foreground">· View in panel</span>
</button>
