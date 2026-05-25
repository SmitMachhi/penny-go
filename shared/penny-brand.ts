import type { FundingConfidence } from './funding-brief.js';

export type PennyBrandTokens = {
	background: string;
	foreground: string;
	card: string;
	cardForeground: string;
	primary: string;
	primaryForeground: string;
	muted: string;
	mutedForeground: string;
	border: string;
	accent: string;
};

export const PENNY_BRAND_LIGHT: PennyBrandTokens = {
	background: 'oklch(0.99 0.002 260)',
	foreground: 'oklch(0.18 0.02 260)',
	card: 'oklch(1 0 0)',
	cardForeground: 'oklch(0.18 0.02 260)',
	primary: 'oklch(0.45 0.12 250)',
	primaryForeground: 'oklch(0.99 0 0)',
	muted: 'oklch(0.96 0.005 260)',
	mutedForeground: 'oklch(0.45 0.02 260)',
	border: 'oklch(0.9 0.01 260)',
	accent: 'oklch(0.94 0.02 250)'
};

export type ConfidenceBadgeStyle = {
	label: string;
	background: string;
	foreground: string;
	border: string;
};

export const CONFIDENCE_BADGE_STYLES: Record<FundingConfidence, ConfidenceBadgeStyle> = {
	verified_live: {
		label: 'Verified live',
		background: 'oklch(0.94 0.04 155)',
		foreground: 'oklch(0.35 0.08 155)',
		border: 'oklch(0.82 0.06 155)'
	},
	newly_discovered: {
		label: 'Newly discovered',
		background: 'oklch(0.94 0.04 250)',
		foreground: 'oklch(0.35 0.08 250)',
		border: 'oklch(0.82 0.06 250)'
	},
	could_not_verify: {
		label: 'Could not verify',
		background: 'oklch(0.95 0.03 55)',
		foreground: 'oklch(0.42 0.08 55)',
		border: 'oklch(0.84 0.05 55)'
	}
};

export function pennyBrandCssVariables(tokens: PennyBrandTokens = PENNY_BRAND_LIGHT): string {
	return [
		`--penny-bg: ${tokens.background}`,
		`--penny-fg: ${tokens.foreground}`,
		`--penny-card: ${tokens.card}`,
		`--penny-card-fg: ${tokens.cardForeground}`,
		`--penny-primary: ${tokens.primary}`,
		`--penny-primary-fg: ${tokens.primaryForeground}`,
		`--penny-muted: ${tokens.muted}`,
		`--penny-muted-fg: ${tokens.mutedForeground}`,
		`--penny-border: ${tokens.border}`,
		`--penny-accent: ${tokens.accent}`
	].join('; ');
}
