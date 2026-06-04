<script lang="ts">
	import type { ArtifactVersionSummary } from '$lib/chat/artifacts.js';

	type Props = {
		versions: ArtifactVersionSummary[];
		selectedVersion: number;
		onSelect: (version: number) => void;
	};

	let { versions, selectedVersion, onSelect }: Props = $props();

	function formatVersionLabel(entry: ArtifactVersionSummary): string {
		const date = new Date(entry.updatedAt);
		const dateLabel = Number.isNaN(date.getTime())
			? entry.updatedAt
			: date.toLocaleString(undefined, {
					month: 'short',
					day: 'numeric',
					hour: 'numeric',
					minute: '2-digit'
				});
		return `v${entry.version} · ${dateLabel}`;
	}
</script>

{#if versions.length > 1}
	<label class="flex min-w-0 flex-col gap-1">
		<span class="text-xs text-muted-foreground">Version history</span>
		<select
			class="h-9 w-full min-w-0 rounded-lg border border-border bg-card px-2 text-sm"
			value={selectedVersion}
			onchange={(event) => {
				const value = Number.parseInt(event.currentTarget.value, 10);
				if (Number.isInteger(value)) {
					onSelect(value);
				}
			}}
		>
			{#each versions as entry (entry.version)}
				<option value={entry.version}>{formatVersionLabel(entry)}</option>
			{/each}
		</select>
	</label>
{/if}
