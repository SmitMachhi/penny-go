<script lang="ts">
	import '../app.css';
	import { ModeWatcher } from 'mode-watcher';
	import {
		LIGHT_MODE_BOOTSTRAP_SCRIPT,
		PENNY_DEFAULT_MODE,
		PENNY_TRACK_SYSTEM_MODE
	} from '$lib/theme/light-mode-default.js';

	let { children } = $props();

	const APP_TITLE = 'Penny';
</script>

<svelte:head>
	<title>{APP_TITLE}</title>
	<meta name="description" content="Funding scout for Canadian teams" />
	<meta name="application-name" content={APP_TITLE} />
	<meta name="theme-color" content="#3A6CF5" media="(prefers-color-scheme: light)" />
	<meta name="theme-color" content="#4A7DF7" media="(prefers-color-scheme: dark)" />
	<script>{@html LIGHT_MODE_BOOTSTRAP_SCRIPT}</script>
</svelte:head>

<ModeWatcher defaultMode={PENNY_DEFAULT_MODE} track={PENNY_TRACK_SYSTEM_MODE} />
{@render children?.()}
