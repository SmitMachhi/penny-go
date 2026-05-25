<script lang="ts">
	import { X } from '@lucide/svelte';

	import type { ArtifactSummary } from '$lib/chat/artifacts.js';
	import ArtifactToolbar from '$lib/components/artifacts/ArtifactToolbar.svelte';
	import SlidePreview from '$lib/components/artifacts/SlidePreview.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { cn } from '$lib/utils.js';

	type Props = {
		open: boolean;
		artifacts: ArtifactSummary[];
		activeArtifactId: string | null;
		sessionKey: string;
		onClose: () => void;
		onSelect: (artifactId: string) => void;
	};

	let { open, artifacts, activeArtifactId, sessionKey, onClose, onSelect }: Props = $props();

	const activeArtifact = $derived(
		artifacts.find((artifact) => artifact.artifactId === activeArtifactId) ?? artifacts[0] ?? null
	);
</script>

{#if open && activeArtifact}
	<button
		type="button"
		class="fixed inset-0 z-40 bg-black/40 lg:hidden"
		aria-label="Close artifact panel"
		onclick={onClose}
	></button>

	<aside
		class={cn(
			'z-50 flex h-full w-full shrink-0 flex-col border-border bg-card/95 lg:w-[min(520px,42vw)] lg:border-l',
			open ? 'fixed inset-y-0 right-0 shadow-xl lg:static lg:shadow-none' : 'hidden lg:flex'
		)}
	>
		<div class="flex items-center justify-between border-b border-border px-4 py-3">
			<div>
				<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Artifact</p>
				<p class="text-sm font-semibold">Funding brief</p>
			</div>
			<Button variant="ghost" size="icon" onclick={onClose} aria-label="Close artifact panel">
				<X class="h-4 w-4" />
			</Button>
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
		<SlidePreview artifactId={activeArtifact.artifactId} {sessionKey} />
	</aside>
{/if}
