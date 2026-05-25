<script lang="ts">
	import { FileText } from '@lucide/svelte';

	import type { ArtifactSummary } from '$lib/chat/artifacts.js';
	import { artifactChipLabel } from '$lib/chat/artifacts.js';
	import Button from '$lib/components/ui/button.svelte';

	type Props = {
		artifact: ArtifactSummary;
		onOpen: (artifactId: string) => void;
	};

	let { artifact, onOpen }: Props = $props();
</script>

<Button
	variant="outline"
	class="mt-2 h-auto justify-start gap-2 px-3 py-2 text-left text-xs"
	onclick={() => onOpen(artifact.artifactId)}
>
	<FileText class="h-4 w-4 shrink-0 text-primary" />
	<span class="text-xs leading-snug">{artifactChipLabel(artifact)}</span>
</Button>
