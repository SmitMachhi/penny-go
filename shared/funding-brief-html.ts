import type { FundingBriefBusiness } from './funding-brief-types.js';

export function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

export function formatBusinessSnapshot(business: FundingBriefBusiness | undefined): string[] {
	if (!business) {
		return [];
	}
	const lines: string[] = [];
	if (business.name) {
		lines.push(`Business: ${business.name}`);
	}
	if (business.province) {
		lines.push(`Province: ${business.province}`);
	}
	if (business.sector) {
		lines.push(`Sector: ${business.sector}`);
	}
	if (business.employees) {
		lines.push(`Employees: ${business.employees}`);
	}
	if (business.projectSummary) {
		lines.push(`Project: ${business.projectSummary}`);
	}
	return lines;
}

export function formatSourceLinkLabel(url: string): string {
	try {
		const parsed = new URL(url);
		const path =
			parsed.pathname.length > 36 ? `${parsed.pathname.slice(0, 33)}…` : parsed.pathname;
		return `${parsed.hostname}${path === '/' ? '' : path}`;
	} catch {
		return url;
	}
}

export function isLegacySlideHtml(html: string): boolean {
	return (
		html.includes('class="deck"') ||
		html.includes('id="nextBtn"') ||
		html.includes('class="slide active"') ||
		!html.includes('page-stack')
	);
}
