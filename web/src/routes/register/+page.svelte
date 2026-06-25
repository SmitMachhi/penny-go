<script lang="ts">
	let { data, form } = $props();
	let nextPath = $derived(form?.next ?? data.next);
	let emailValue = $derived(form?.email ?? '');
</script>

<svelte:head>
	<title>Create account · Penny</title>
</svelte:head>

<main class="min-h-screen bg-background px-6 py-10 text-foreground">
	<section class="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-sm flex-col justify-center">
		<div class="mb-8">
			<p class="text-sm font-semibold text-muted-foreground">Penny</p>
			<h1 class="mt-2 text-3xl font-semibold tracking-normal">Create account</h1>
		</div>

		{#if form?.sent}
			<div class="rounded-lg border border-border bg-card px-4 py-3 text-sm">
				Check {form.email} to confirm your account.
			</div>
			<a class="mt-4 block text-sm font-medium text-muted-foreground" href={`/login?next=${encodeURIComponent(nextPath)}`}>
				Back to login
			</a>
		{:else}
			<form method="POST" class="space-y-4">
				<input type="hidden" name="next" value={nextPath} />
				<label class="block space-y-2">
					<span class="text-sm font-medium">Email</span>
					<input
						class="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring"
						name="email"
						type="email"
						autocomplete="email"
						value={emailValue}
						required
					/>
				</label>
				<label class="block space-y-2">
					<span class="text-sm font-medium">Password</span>
					<input
						class="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring"
						name="password"
						type="password"
						autocomplete="new-password"
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
					Create account
				</button>
			</form>

			<a class="mt-4 block text-sm font-medium text-muted-foreground" href={`/login?next=${encodeURIComponent(nextPath)}`}>
				Back to login
			</a>
		{/if}
	</section>
</main>
