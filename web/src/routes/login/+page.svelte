<script lang="ts">
	let { data, form } = $props();
	let nextPath = $derived(form?.next ?? data.next);
	let emailValue = $derived(form?.email ?? '');
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

		<form method="POST" action="?/email" class="space-y-4">
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
					autocomplete="current-password"
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
				Log in
			</button>
		</form>

		<a class="mt-3 block text-sm font-medium text-muted-foreground" href={`/register?next=${encodeURIComponent(nextPath)}`}>
			Create account
		</a>
	</section>
</main>
