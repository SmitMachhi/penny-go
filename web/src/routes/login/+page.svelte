<script lang="ts">
	let { data, form } = $props();
	let nextPath = $derived(form?.next ?? data.next);
</script>

<svelte:head>
	<title>Log in · Penny</title>
</svelte:head>

<main class="min-h-screen bg-background px-6 py-10 text-foreground">
	<section class="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-sm flex-col justify-center">
		<div class="mb-8">
			<p class="text-sm font-semibold text-muted-foreground">Penny</p>
			<h1 class="mt-2 text-3xl font-semibold tracking-normal">Log in</h1>
		</div>

		<div class="space-y-3">
			<form method="POST" action="?/google">
				<input type="hidden" name="next" value={nextPath} />
				<button
					type="submit"
					class="h-11 w-full rounded-md border border-input bg-background px-4 text-sm font-semibold"
				>
					Continue with Google
				</button>
			</form>

			<form method="POST" action="?/microsoft">
				<input type="hidden" name="next" value={nextPath} />
				<button
					type="submit"
					class="h-11 w-full rounded-md border border-input bg-background px-4 text-sm font-semibold"
				>
					Continue with Microsoft
				</button>
			</form>
		</div>

		{#if form?.error}
			<p class="mt-4 text-sm text-destructive">{form.error}</p>
		{/if}
	</section>
</main>
