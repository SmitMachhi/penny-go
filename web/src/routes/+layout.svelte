<script lang="ts">
	import '../app.css';
	import { ModeWatcher } from 'mode-watcher';

	let { children } = $props();

	const APP_TITLE = 'Penny';
</script>

<svelte:head>
	<title>{APP_TITLE}</title>
	<meta name="description" content="Funding scout for Canadian teams" />
	<meta name="application-name" content={APP_TITLE} />
</svelte:head>

<ModeWatcher defaultMode="system" />
{@render children?.()}
