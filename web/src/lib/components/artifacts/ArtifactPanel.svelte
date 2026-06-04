<script lang="ts">
	import type { ArtifactDetailResponse, ArtifactSummary } from '$lib/chat/artifacts.js';
	import ArtifactToolbar from '$lib/components/artifacts/ArtifactToolbar.svelte';
	import DocumentPreview from '$lib/components/artifacts/DocumentPreview.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { cn } from '$lib/utils.js';

	const UPDATE_NOTICE_MS = 5000;

	type Props = {
		artifacts: ArtifactSummary[];
		activeArtifactId: string | null;
		sessionKey: string;
		open: boolean;
		widthPx: number;
		onClose: () => void;
		onSelect: (artifactId: string) => void;
	};

	let { artifacts, activeArtifactId, sessionKey, open, widthPx, onClose, onSelect }: Props = $props();

	let selectedVersion = $state(1);
	let versions = $state<ArtifactDetailResponse['versions']>([]);
	let detailLoading = $state(false);
	let detailArtifactId = $state<string | null>(null);
	let updateNotice = $state<string | null>(null);
	let updateNoticeTimeout: ReturnType<typeof setTimeout> | undefined;

	const activeArtifact = $derived(
		artifacts.find((artifact) => artifact.artifactId === activeArtifactId) ?? artifacts[0] ?? null
	);

	const selectedVersionEntry = $derived(
		versions.find((entry) => entry.version === selectedVersion) ?? versions.at(-1) ?? null
	);

	const previewPdfAvailable = $derived(selectedVersionEntry?.pdfAvailable ?? activeArtifact?.pdfAvailable ?? false);

	$effect(() => {
		const artifact = activeArtifact;
		const key = sessionKey;
		if (!artifact || !open) {
			return;
		}

		if (detailArtifactId !== artifact.artifactId) {
			selectedVersion = artifact.latestVersion;
			detailArtifactId = artifact.artifactId;
		}

		let cancelled = false;
		detailLoading = true;

		void (async () => {
			try {
				const response = await fetch(
					`/api/artifacts/${artifact.artifactId}?sessionKey=${encodeURIComponent(key)}`
				);
				if (!response.ok) {
					throw new Error('failed_to_load_artifact_detail');
				}
				const detail = (await response.json()) as ArtifactDetailResponse;
				if (cancelled) {
					return;
				}
				versions = detail.versions;
				const latest = detail.artifact.latestVersion;
				const previousLatest = selectedVersion;
				if (latest > previousLatest && previousLatest > 0) {
					showUpdateNotice(`Updated to v${latest}`);
					selectedVersion = latest;
				} else if (!versions.some((entry) => entry.version === selectedVersion)) {
					selectedVersion = latest;
				}
			} catch {
				if (!cancelled) {
					versions = [
						{
							version: artifact.latestVersion,
							title: artifact.title,
							updatedAt: artifact.updatedAt,
							pdfAvailable: artifact.pdfAvailable
						}
					];
					selectedVersion = artifact.latestVersion;
				}
			} finally {
				if (!cancelled) {
					detailLoading = false;
				}
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		if (!activeArtifact) {
			return;
		}
		if (!versions.some((entry) => entry.version === selectedVersion)) {
			selectedVersion = activeArtifact.latestVersion;
		}
	});

	function showUpdateNotice(message: string): void {
		updateNotice = message;
		if (updateNoticeTimeout) {
			clearTimeout(updateNoticeTimeout);
		}
		updateNoticeTimeout = setTimeout(() => {
			updateNotice = null;
		}, UPDATE_NOTICE_MS);
	}

	function handleSelectVersion(version: number): void {
		selectedVersion = version;
	}
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
			'artifact-panel-aside z-50 flex h-full min-h-0 w-full shrink-0 flex-col self-stretch overflow-hidden border-border bg-card/95',
			'fixed inset-y-0 right-0 border-l border-border lg:static lg:max-w-[72vw] lg:w-[var(--artifact-panel-width)]'
		)}
		style="--artifact-panel-width: {widthPx}px"
	>
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

		<ArtifactToolbar
			artifact={activeArtifact}
			{sessionKey}
			{versions}
			{selectedVersion}
			pdfAvailable={previewPdfAvailable}
			{updateNotice}
			{detailLoading}
			onSelectVersion={handleSelectVersion}
			onClose={onClose}
		/>
		<div class="relative min-h-0 flex-1 overflow-hidden bg-muted/20">
			<DocumentPreview
				artifactId={activeArtifact.artifactId}
				{sessionKey}
				version={selectedVersion}
				pdfAvailable={previewPdfAvailable}
			/>
		</div>
	</aside>
{/if}
