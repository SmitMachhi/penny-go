<script lang="ts">
	import { CheckCircle2, LockKeyhole, SearchCheck } from '@lucide/svelte';
	import type { Snippet } from 'svelte';

	type Props = {
		children: Snippet;
		description: string;
		eyebrow: string;
		switchCta: string;
		switchHref: string;
		switchLabel: string;
		title: string;
	};

	let {
		children,
		description,
		eyebrow,
		switchCta,
		switchHref,
		switchLabel,
		title
	}: Props = $props();
</script>

<main class="min-h-screen overflow-hidden bg-[oklch(0.982_0.008_245)] text-foreground">
	<section class="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(30rem,34rem)]">
		<aside
			class="relative hidden overflow-hidden border-r border-[oklch(0.86_0.025_255)] bg-[oklch(0.965_0.018_250)] px-10 py-10 lg:flex"
			aria-label="Penny account context"
		>
			<div
				class="absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(circle_at_18%_22%,oklch(0.79_0.12_268_/_0.24),transparent_34%),radial-gradient(circle_at_82%_78%,oklch(0.86_0.08_88_/_0.36),transparent_38%)]"
			></div>

			<div class="relative flex w-full flex-col justify-between">
				<div class="flex items-center gap-3">
					<div
						class="grid h-10 w-10 place-items-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20"
					>
						P
					</div>
					<div>
						<p class="text-sm font-semibold leading-none">Penny</p>
						<p class="mt-1 text-xs text-muted-foreground">Funding workspace</p>
					</div>
				</div>

				<div class="max-w-xl">
					<p class="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
						Private by default
					</p>
					<h2 class="mt-4 max-w-[13ch] font-display text-5xl font-semibold leading-tight tracking-normal text-[oklch(0.26_0.035_255)]">
						Return to your funding work.
					</h2>
					<p class="mt-5 max-w-[34rem] text-base leading-7 text-[oklch(0.43_0.035_255)]">
						Sign in to continue where Penny left off: chats, evidence, and generated plans stay tied to your account.
					</p>
				</div>

				<div class="grid max-w-xl gap-3">
					<div class="flex items-center gap-3 rounded-2xl border border-[oklch(0.84_0.025_255)] bg-[oklch(0.992_0.004_245_/_0.72)] px-4 py-3">
						<LockKeyhole class="h-4 w-4 shrink-0 text-primary" strokeWidth={2.2} />
						<p class="text-sm font-medium text-[oklch(0.34_0.03_255)]">Account-scoped sessions</p>
					</div>
					<div class="flex items-center gap-3 rounded-2xl border border-[oklch(0.84_0.025_255)] bg-[oklch(0.992_0.004_245_/_0.72)] px-4 py-3">
						<SearchCheck class="h-4 w-4 shrink-0 text-primary" strokeWidth={2.2} />
						<p class="text-sm font-medium text-[oklch(0.34_0.03_255)]">Verified funding research</p>
					</div>
					<div class="flex items-center gap-3 rounded-2xl border border-[oklch(0.84_0.025_255)] bg-[oklch(0.992_0.004_245_/_0.72)] px-4 py-3">
						<CheckCircle2 class="h-4 w-4 shrink-0 text-[oklch(0.56_0.12_150)]" strokeWidth={2.2} />
						<p class="text-sm font-medium text-[oklch(0.34_0.03_255)]">Email verification enabled</p>
					</div>
				</div>
			</div>
		</aside>

		<section class="flex min-h-screen items-center justify-center px-5 py-8 sm:px-8">
			<div class="w-full max-w-[27rem]">
				<div class="mb-8 lg:hidden">
					<div class="mb-7 flex items-center gap-3">
						<div
							class="grid h-10 w-10 place-items-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
						>
							P
						</div>
						<p class="text-sm font-semibold">Penny</p>
					</div>
				</div>

				<div class="mb-8">
					<p class="text-sm font-semibold text-primary">{eyebrow}</p>
					<h1 class="mt-3 font-display text-4xl font-semibold leading-tight tracking-normal text-[oklch(0.25_0.025_255)]">
						{title}
					</h1>
					<p class="mt-3 max-w-[32rem] text-sm leading-6 text-muted-foreground">
						{description}
					</p>
				</div>

				{@render children()}

				<p class="mt-6 text-sm text-muted-foreground">
					{switchLabel}
					<a class="font-semibold text-primary hover:text-penny-brand-deep" href={switchHref}>
						{switchCta}
					</a>
				</p>
			</div>
		</section>
	</section>
</main>
