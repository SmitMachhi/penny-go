<script lang="ts">
	import type { ArtifactSummary } from '$lib/chat/artifacts.js';
	import ArtifactToolbar from '$lib/components/artifacts/ArtifactToolbar.svelte';
	import DocumentPreview from '$lib/components/artifacts/DocumentPreview.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { cn } from '$lib/utils.js';

	type Props = {
		artifacts: ArtifactSummary[];
		activeArtifactId: string | null;
		sessionKey: string;
		open: boolean;
		onClose: () => void;
		onSelect: (artifactId: string) => void;
	};

	let { artifacts, activeArtifactId, sessionKey, open, onClose, onSelect }: Props = $props();

	const activeArtifact = $derived(
		artifacts.find((artifact) => artifact.artifactId === activeArtifactId) ?? artifacts[0] ?? null
	);
</script>

{#if activeArtifact && open}
	<button
		type="button"
		class="fixed inset-0 z-40 bg-black/40 lg:hidden"
		aria-label="Close artifact panel"
		onclick={onClose}
	></button>

	<aside
		class={cn(
			'z-50 flex h-full min-h-0 w-full shrink-0 flex-col self-stretch overflow-hidden border-border bg-card/95',
			'fixed inset-y-0 right-0 border-l border-border lg:static lg:w-[min(520px,42vw)]'
		)}
	>
		<div class="border-b border-border px-4 py-3">
			<p class="text-xs font-medium tracking-[0.2em] text-discovery uppercase">Artifact</p>
			<p class="text-sm font-semibold">Funding plan</p>
		</div>

		{#if artifacts.length > 1}
			<div class="flex gap-2 overflow-x-auto border-b border-border px-4 py-2">
				{#each artifacts as artifact (artifact.artifactId)}
					<Button
						variant={artifact.artifactId === activeArtifact.artifactId ? 'default' : 'outline'}
						class="h-8 shrink-0 px-3 text-xs"
						onclick={() => onSelect(artifact.artifactId)}
					>
						{artifact.title}
					</Button>
				{/each}
			</div>
		{/if}

		<ArtifactToolbar artifact={activeArtifact} {sessionKey} />
			<div class="relative min-h-0 flex-1 overflow-hidden bg-muted/20">
				<DocumentPreview
					artifactId={activeArtifact.artifactId}
					{sessionKey}
					pdfAvailable={activeArtifact.pdfAvailable}
				/>
			</div>
	</aside>
{/if}
