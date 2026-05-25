<script lang="ts">
	type Props = {
		artifactId: string;
		sessionKey: string;
	};

	let { artifactId, sessionKey }: Props = $props();

	const previewSrc = $derived(
		`/api/artifacts/${artifactId}?sessionKey=${encodeURIComponent(sessionKey)}&preview=html`
	);
</script>

<iframe
	title="Funding brief slideshow preview"
	src={previewSrc}
	class="h-full w-full flex-1 border-0 bg-background"
	sandbox="allow-scripts allow-same-origin"
></iframe>
