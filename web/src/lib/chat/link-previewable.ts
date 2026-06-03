const HTTP_PROTOCOL = 'http:';
const HTTPS_PROTOCOL = 'https:';

export function isPreviewableHref(href: string | null | undefined): href is string {
	if (!href?.trim()) {
		return false;
	}

	try {
		const parsed = new URL(href);
		return parsed.protocol === HTTP_PROTOCOL || parsed.protocol === HTTPS_PROTOCOL;
	} catch {
		return false;
	}
}

export function linkPreviewLabel(href: string, text: string): string {
	const trimmedText = text.trim();
	if (!trimmedText || trimmedText === href) {
		return hostnameLabel(href);
	}

	const MAX_INLINE_LABEL_CHARS = 48;
	if (trimmedText.length > MAX_INLINE_LABEL_CHARS) {
		return hostnameLabel(href);
	}

	return trimmedText;
}

function hostnameLabel(href: string): string {
	try {
		const hostname = new URL(href).hostname.replace(/^www\./i, '');
		return hostname || href;
	} catch {
		return href;
	}
}
