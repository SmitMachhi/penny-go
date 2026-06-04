<script lang="ts">
	const homeView = import('$lib/components/chat/HomeView.svelte');
</script>

{#await homeView then module}
	{@const HomeView = module.default}
	<HomeView />
{/await}
