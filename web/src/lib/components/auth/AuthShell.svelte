<script lang="ts">
	import { Database, FileText, ShieldCheck } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import pennyIcon from '$lib/assets/penny-icon-auth.png';

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
					<img
						src={pennyIcon}
						alt="Penny"
						class="h-11 w-11 rounded-xl shadow-sm shadow-primary/20"
					/>
					<div>
						<p class="text-sm font-semibold leading-none">Penny</p>
						<p class="mt-1 text-xs text-muted-foreground">AI Grant Consultant</p>
					</div>
				</div>

				<div class="max-w-xl">
					<p class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
						<span>Built for Canadian businesses</span>
						<span aria-hidden="true">🇨🇦</span>
					</p>
					<h2 class="mt-4 max-w-[15ch] font-display text-5xl font-semibold leading-tight tracking-normal text-[oklch(0.26_0.035_255)]">
						<span class="block whitespace-nowrap">Find funding in minutes,</span>
						<span class="block whitespace-nowrap">not weeks.</span>
					</h2>
					<p class="mt-5 max-w-[34rem] text-base leading-7 text-[oklch(0.43_0.035_255)]">
						<span class="block">Penny looks for grants and programs,</span>
						<span class="block">checks the source, and helps make a plan.</span>
					</p>
				</div>

				<div class="grid max-w-xl gap-3">
					<div class="flex items-center gap-3 rounded-2xl border border-[oklch(0.84_0.025_255)] bg-[oklch(0.992_0.004_245_/_0.72)] px-4 py-3">
						<Database class="h-4 w-4 shrink-0 text-primary" strokeWidth={2.2} />
						<p class="text-sm font-medium text-[oklch(0.34_0.03_255)]">Find grants and programs</p>
					</div>
					<div class="flex items-center gap-3 rounded-2xl border border-[oklch(0.84_0.025_255)] bg-[oklch(0.992_0.004_245_/_0.72)] px-4 py-3">
						<ShieldCheck class="h-4 w-4 shrink-0 text-primary" strokeWidth={2.2} />
						<p class="text-sm font-medium text-[oklch(0.34_0.03_255)]">Check official sources</p>
					</div>
					<div class="flex items-center gap-3 rounded-2xl border border-[oklch(0.84_0.025_255)] bg-[oklch(0.992_0.004_245_/_0.72)] px-4 py-3">
						<FileText class="h-4 w-4 shrink-0 text-primary" strokeWidth={2.2} />
						<p class="text-sm font-medium text-[oklch(0.34_0.03_255)]">Make a funding plan</p>
					</div>
				</div>
			</div>
		</aside>

		<section class="flex min-h-screen items-center justify-center px-5 py-8 sm:px-8">
			<div class="w-full max-w-[27rem]">
				<div class="mb-8 lg:hidden">
					<div class="mb-7 flex items-center gap-3">
						<img src={pennyIcon} alt="Penny" class="h-10 w-10 rounded-xl" />
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
