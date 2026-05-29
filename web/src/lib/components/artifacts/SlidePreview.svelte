<script lang="ts">
	type Props = {
		artifactId: string;
		sessionKey: string;
	};

	let { artifactId, sessionKey }: Props = $props();

	const previewSrc = $derived(
		`/api/artifacts/${artifactId}?sessionKey=${encodeURIComponent(sessionKey)}&preview=html&embedded=1`
	);
</script>

<iframe
	title="Funding brief slideshow preview"
	src={previewSrc}
	class="absolute inset-0 h-full w-full border-0 bg-background"
	sandbox="allow-scripts"
></iframe>
