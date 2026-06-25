<script lang="ts">
	let { data, form } = $props();
	let emailValue = $derived(form?.email ?? '');
	let nextPath = $derived(form?.next ?? data.next);
</script>

<svelte:head>
	<title>Sign in · Penny</title>
</svelte:head>

<main class="min-h-screen bg-background px-6 py-10 text-foreground">
	<section class="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md flex-col justify-center">
		<div class="mb-8">
			<p class="text-sm font-semibold text-muted-foreground">Penny</p>
			<h1 class="mt-2 text-3xl font-semibold tracking-normal">Welcome back</h1>
		</div>

		<form method="POST" action="?/google" class="mb-5">
			<input type="hidden" name="next" value={nextPath} />
			<button
				type="submit"
				class="h-11 w-full rounded-md border border-input bg-background px-4 text-sm font-semibold"
			>
				Continue with Google
			</button>
		</form>

		<div class="mb-5 flex items-center gap-3 text-xs font-semibold uppercase text-muted-foreground">
			<div class="h-px flex-1 bg-border"></div>
			<span>Email</span>
			<div class="h-px flex-1 bg-border"></div>
		</div>

		<form method="POST" action="?/signIn" class="space-y-4">
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

			{#if form?.mode === 'sign-in' && form?.error}
				<p class="text-sm text-destructive">{form.error}</p>
			{/if}

			<button
				type="submit"
				class="h-11 w-full rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
			>
				Sign in
			</button>
		</form>

		<form method="POST" action="?/signUp" class="mt-6 space-y-4 border-t border-border pt-6">
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

			{#if form?.mode === 'sign-up' && form?.error}
				<p class="text-sm text-destructive">{form.error}</p>
			{/if}

			<button
				type="submit"
				class="h-11 w-full rounded-md border border-input bg-background px-4 text-sm font-semibold"
			>
				Create account
			</button>
		</form>

		<form method="POST" action="?/verifyCode" class="mt-6 space-y-4 border-t border-border pt-6">
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
				<span class="text-sm font-medium">Verification code</span>
				<input
					class="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring"
					name="token"
					inputmode="numeric"
					autocomplete="one-time-code"
					required
				/>
			</label>
			{#if form?.mode === 'verify' && form?.error}
				<p class="text-sm text-destructive">{form.error}</p>
			{/if}
			<button
				type="submit"
				class="h-11 w-full rounded-md border border-input bg-background px-4 text-sm font-semibold"
			>
				Verify code
			</button>
		</form>
	</section>
</main>
