<script lang="ts">
	let { data, form } = $props();
</script>

<svelte:head>
	<title>Sign in · Penny</title>
</svelte:head>

<main class="min-h-screen bg-background px-6 py-10 text-foreground">
	<section class="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-sm flex-col justify-center">
		<div class="mb-8">
			<p class="text-sm font-semibold text-muted-foreground">Penny</p>
			<h1 class="mt-2 text-3xl font-semibold tracking-normal">Sign in</h1>
		</div>

		{#if form?.sent}
			<div class="rounded-lg border border-border bg-card px-4 py-3 text-sm">
				Check {form.email} for a sign-in link.
			</div>
		{:else}
			<form method="POST" class="space-y-4">
				<input type="hidden" name="next" value={data.next} />
				<label class="block space-y-2">
					<span class="text-sm font-medium">Email</span>
					<input
						class="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring"
						name="email"
						type="email"
						autocomplete="email"
						value={form?.email ?? ''}
						required
					/>
				</label>

				{#if form?.error}
					<p class="text-sm text-destructive">{form.error}</p>
				{/if}

				<button
					type="submit"
					class="h-11 w-full rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
				>
					Send sign-in link
				</button>
			</form>
		{/if}
	</section>
</main>
