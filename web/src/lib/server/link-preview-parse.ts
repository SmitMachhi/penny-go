import type { LinkPreview } from '$lib/link-preview/types.js';
import { parsePreviewableUrl } from '$lib/server/link-preview-url.js';

const DESCRIPTION_MAX_CHARS = 200;
const TITLE_FALLBACK_MAX_CHARS = 120;

export function parseLinkPreviewFromHtml(html: string, url: URL): LinkPreview {
	const title =
		readMetaProperty(html, 'og:title') ??
		readMetaName(html, 'twitter:title') ??
		readTitleTag(html) ??
		url.hostname;

	const description = truncateDescription(
		readMetaProperty(html, 'og:description') ??
			readMetaName(html, 'description') ??
			readMetaName(html, 'twitter:description') ??
			''
	);

	const siteName =
		readMetaProperty(html, 'og:site_name') ?? hostnameSiteName(url.hostname);

	const favicon = resolveFavicon(html, url);

	return {
		url: url.toString(),
		siteName,
		title: truncateTitle(title),
		description,
		favicon
	};
}

function readMetaProperty(html: string, property: string): string | undefined {
	const pattern = new RegExp(
		`<meta[^>]+property=["']${escapeRegExp(property)}["'][^>]+content=["']([^"']*)["']`,
		'i'
	);
	const altPattern = new RegExp(
		`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${escapeRegExp(property)}["']`,
		'i'
	);
	return pattern.exec(html)?.[1]?.trim() || altPattern.exec(html)?.[1]?.trim() || undefined;
}

function readMetaName(html: string, name: string): string | undefined {
	const pattern = new RegExp(
		`<meta[^>]+name=["']${escapeRegExp(name)}["'][^>]+content=["']([^"']*)["']`,
		'i'
	);
	const altPattern = new RegExp(
		`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${escapeRegExp(name)}["']`,
		'i'
	);
	return pattern.exec(html)?.[1]?.trim() || altPattern.exec(html)?.[1]?.trim() || undefined;
}

function readTitleTag(html: string): string | undefined {
	return /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1]?.trim() || undefined;
}

function resolveFavicon(html: string, url: URL): string | null {
	const iconHref =
		readLinkRel(html, 'icon') ??
		readLinkRel(html, 'shortcut icon') ??
		readLinkRel(html, 'apple-touch-icon');

	if (iconHref) {
		try {
			return safeFaviconUrl(new URL(iconHref, url));
		} catch {
			return null;
		}
	}

	try {
		return safeFaviconUrl(new URL('/favicon.ico', url));
	} catch {
		return null;
	}
}

function safeFaviconUrl(url: URL): string | null {
	try {
		return parsePreviewableUrl(url.toString()).toString();
	} catch {
		return null;
	}
}

function readLinkRel(html: string, rel: string): string | undefined {
	const pattern = new RegExp(
		`<link[^>]+rel=["']${escapeRegExp(rel)}["'][^>]+href=["']([^"']+)["']`,
		'i'
	);
	const altPattern = new RegExp(
		`<link[^>]+href=["']([^"']+)["'][^>]+rel=["']${escapeRegExp(rel)}["']`,
		'i'
	);
	return pattern.exec(html)?.[1]?.trim() || altPattern.exec(html)?.[1]?.trim() || undefined;
}

function hostnameSiteName(hostname: string): string {
	return hostname.replace(/^www\./i, '');
}

function truncateDescription(value: string): string {
	const normalized = decodeHtmlEntities(value).replace(/\s+/g, ' ').trim();
	if (normalized.length <= DESCRIPTION_MAX_CHARS) {
		return normalized;
	}
	return `${normalized.slice(0, DESCRIPTION_MAX_CHARS - 1).trimEnd()}…`;
}

function truncateTitle(value: string): string {
	const normalized = decodeHtmlEntities(value).replace(/\s+/g, ' ').trim();
	if (normalized.length <= TITLE_FALLBACK_MAX_CHARS) {
		return normalized;
	}
	return `${normalized.slice(0, TITLE_FALLBACK_MAX_CHARS - 1).trimEnd()}…`;
}

function decodeHtmlEntities(value: string): string {
	return value
		.replaceAll('&amp;', '&')
		.replaceAll('&lt;', '<')
		.replaceAll('&gt;', '>')
		.replaceAll('&quot;', '"')
		.replaceAll('&#39;', "'");
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
