import { linkPreviewLabel } from '$lib/chat/link-previewable.js';

export const PREVIEW_LINK_HINT_TITLE = 'Opens website in a new tab. Hover for preview.';

const EXTERNAL_LINK_ICON = '↗';

export function renderPreviewLinkHtml(
	href: string,
	text: string,
	title: string | null | undefined
): string {
	const safeHref = escapeHtmlAttribute(href);
	const label = escapeHtmlAttribute(linkPreviewLabel(href, text));
	const hintTitle = escapeHtmlAttribute(title?.trim() || PREVIEW_LINK_HINT_TITLE);
	const ariaLabel = escapeHtmlAttribute(
		`Link to ${linkPreviewLabel(href, text)}, opens in a new tab`
	);

	return [
		`<a class="penny-link-preview" data-preview-url="${safeHref}" href="${safeHref}"`,
		` title="${hintTitle}" aria-label="${ariaLabel}"`,
		' target="_blank" rel="noopener noreferrer">',
		`<span class="penny-link-preview__label">${label}</span>`,
		`<span class="penny-link-preview__icon" aria-hidden="true">${EXTERNAL_LINK_ICON}</span>`,
		'</a>'
	].join('');
}

function escapeHtmlAttribute(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;');
}
