<script lang="ts">
	import { ArrowRight, Mail, ShieldAlert } from '@lucide/svelte';
	import AuthShell from '$lib/components/auth/AuthShell.svelte';
	import Button from '$lib/components/ui/button.svelte';

	let { data, form } = $props();
	let nextPath = $derived(form?.next ?? data.next);
	let emailValue = $derived(form?.email ?? '');
	let registerHref = $derived(`/register?next=${encodeURIComponent(nextPath)}`);
</script>

<svelte:head>
	<title>Log in · Penny</title>
</svelte:head>

<AuthShell
	eyebrow="Welcome back"
	title="Log in to Penny"
	description="Use the email and password connected to your private workspace."
	switchLabel="New here? "
	switchCta="Create an account"
	switchHref={registerHref}
>
	<form method="POST" action="?/email" class="space-y-5">
		<input type="hidden" name="next" value={nextPath} />
		<label class="block space-y-2">
			<span class="text-sm font-semibold text-[oklch(0.32_0.025_255)]">Email</span>
			<div class="relative">
				<Mail
					class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
					strokeWidth={2}
				/>
				<input
					class="h-12 w-full rounded-xl border border-[oklch(0.84_0.025_255)] bg-[oklch(0.995_0.004_245)] pl-10 pr-3 text-[0.95rem] outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/10"
					name="email"
					type="email"
					autocomplete="email"
					value={emailValue}
					placeholder="you@example.com"
					aria-invalid={form?.error ? 'true' : undefined}
					required
				/>
			</div>
		</label>
		<label class="block space-y-2">
			<span class="text-sm font-semibold text-[oklch(0.32_0.025_255)]">Password</span>
			<input
				class="h-12 w-full rounded-xl border border-[oklch(0.84_0.025_255)] bg-[oklch(0.995_0.004_245)] px-3 text-[0.95rem] outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/10"
				name="password"
				type="password"
				autocomplete="current-password"
				placeholder="Your password"
				aria-invalid={form?.error ? 'true' : undefined}
				required
			/>
		</label>

		{#if form?.error}
			<div
				class="flex items-start gap-3 rounded-xl border border-destructive/20 bg-[oklch(0.97_0.025_25)] px-3 py-3 text-sm text-destructive"
				role="alert"
			>
				<ShieldAlert class="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.2} />
				<p>{form.error}</p>
			</div>
		{/if}

		<Button type="submit" class="h-12 w-full rounded-xl text-[0.95rem] font-semibold">
			Log in
			<ArrowRight class="h-4 w-4" strokeWidth={2.2} />
		</Button>
	</form>
</AuthShell>
