import type { LinkPreview } from '$lib/link-preview/types.js';

const PREVIEW_LINK_SELECTOR = 'a.penny-link-preview[data-preview-url]';
const SHOW_DELAY_MS = 120;
const HIDE_DELAY_MS = 100;
const POPOVER_OFFSET_PX = 8;
const VIEWPORT_MARGIN_PX = 12;

let popoverElement: HTMLDivElement | null = null;
let showTimer: ReturnType<typeof setTimeout> | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
let activeAnchor: HTMLAnchorElement | null = null;
let activeRequest = 0;

const clientCache = new Map<string, LinkPreview>();

type PreviewAnchor = {
	href: string;
	dataset: { previewUrl?: string | undefined };
};

export function enhanceLinkPreviews(node: HTMLElement): { destroy: () => void } {
	const show = (anchor: HTMLAnchorElement) => {
		clearTimeout(hideTimer ?? undefined);
		hideTimer = null;
		clearTimeout(showTimer ?? undefined);
		showTimer = setTimeout(() => {
			void openPreview(anchor);
		}, SHOW_DELAY_MS);
	};

	const hide = () => {
		clearTimeout(showTimer ?? undefined);
		showTimer = null;
		clearTimeout(hideTimer ?? undefined);
		hideTimer = setTimeout(() => {
			closePreview();
		}, HIDE_DELAY_MS);
	};

	const onPointerOver = (event: Event) => {
		const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>(PREVIEW_LINK_SELECTOR);
		if (!anchor || !node.contains(anchor)) {
			return;
		}
		show(anchor);
	};

	const onPointerOut = (event: Event) => {
		const from = (event.target as Element | null)?.closest<HTMLAnchorElement>(PREVIEW_LINK_SELECTOR);
		if (!from) {
			return;
		}
		const related = (event as MouseEvent).relatedTarget as Node | null;
		if (related && from.contains(related)) {
			return;
		}
		if (popoverElement?.contains(related ?? null)) {
			return;
		}
		hide();
	};

	const onFocusIn = (event: Event) => {
		const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>(PREVIEW_LINK_SELECTOR);
		if (anchor && node.contains(anchor)) {
			show(anchor);
		}
	};

	const onFocusOut = (event: Event) => {
		const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>(PREVIEW_LINK_SELECTOR);
		if (!anchor) {
			return;
		}
		const related = (event as FocusEvent).relatedTarget as Node | null;
		if (related && (anchor.contains(related) || popoverElement?.contains(related))) {
			return;
		}
		hide();
	};

	node.addEventListener('pointerover', onPointerOver);
	node.addEventListener('pointerout', onPointerOut);
	node.addEventListener('focusin', onFocusIn);
	node.addEventListener('focusout', onFocusOut);

	return {
		destroy() {
			node.removeEventListener('pointerover', onPointerOver);
			node.removeEventListener('pointerout', onPointerOut);
			node.removeEventListener('focusin', onFocusIn);
			node.removeEventListener('focusout', onFocusOut);
			clearTimeout(showTimer ?? undefined);
			clearTimeout(hideTimer ?? undefined);
			closePreview();
		}
	};
}

export function resolvePreviewUrlForAnchor(anchor: PreviewAnchor): string | null {
	const previewUrl = anchor.dataset.previewUrl;
	if (!previewUrl) {
		return null;
	}
	try {
		const href = new URL(anchor.href).toString();
		const preview = new URL(previewUrl, href).toString();
		return href === preview ? preview : null;
	} catch {
		return null;
	}
}

async function openPreview(anchor: HTMLAnchorElement): Promise<void> {
	const url = resolvePreviewUrlForAnchor(anchor);
	if (!url) {
		return;
	}

	activeAnchor = anchor;
	const requestId = ++activeRequest;
	const popover = ensurePopover();
	popover.hidden = false;
	positionPopover(anchor);
	renderLoading(popover);

	try {
		const preview = await loadPreview(url);
		if (requestId !== activeRequest || activeAnchor !== anchor) {
			return;
		}
		renderPreview(popover, preview);
		positionPopover(anchor);
	} catch {
		if (requestId !== activeRequest || activeAnchor !== anchor) {
			return;
		}
		renderFallback(popover, url);
		positionPopover(anchor);
	}
}

function closePreview(): void {
	activeRequest += 1;
	activeAnchor = null;
	if (popoverElement) {
		popoverElement.hidden = true;
	}
}

function ensurePopover(): HTMLDivElement {
	if (!popoverElement) {
		popoverElement = document.createElement('div');
		popoverElement.className = 'penny-link-preview-popover';
		popoverElement.setAttribute('role', 'tooltip');
		popoverElement.hidden = true;
		popoverElement.addEventListener('pointerenter', () => {
			clearTimeout(hideTimer ?? undefined);
			hideTimer = null;
		});
		popoverElement.addEventListener('pointerleave', () => {
			closePreview();
		});
		document.body.appendChild(popoverElement);
	}
	return popoverElement;
}

async function loadPreview(url: string): Promise<LinkPreview> {
	const cached = clientCache.get(url);
	if (cached) {
		return cached;
	}

	const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
	if (!response.ok) {
		throw new Error('preview request failed');
	}

	const preview = (await response.json()) as LinkPreview;
	clientCache.set(url, preview);
	return preview;
}

function renderLoading(popover: HTMLDivElement): void {
	popover.replaceChildren();
	const status = document.createElement('p');
	status.className = 'penny-link-preview-popover__loading';
	status.textContent = 'Loading preview…';
	popover.appendChild(status);
}

function renderFallback(popover: HTMLDivElement, url: string): void {
	popover.replaceChildren();
	let hostname = url;
	try {
		hostname = new URL(url).hostname.replace(/^www\./i, '');
	} catch {
		// keep raw url
	}

	const header = document.createElement('div');
	header.className = 'penny-link-preview-popover__header';

	const site = document.createElement('span');
	site.className = 'penny-link-preview-popover__site';
	site.textContent = hostname;
	header.appendChild(site);

	const title = document.createElement('p');
	title.className = 'penny-link-preview-popover__title';
	title.textContent = hostname;

	popover.append(header, title);
}

function renderPreview(popover: HTMLDivElement, preview: LinkPreview): void {
	popover.replaceChildren();

	const header = document.createElement('div');
	header.className = 'penny-link-preview-popover__header';

	if (preview.favicon) {
		const icon = document.createElement('img');
		icon.className = 'penny-link-preview-popover__icon';
		icon.src = preview.favicon;
		icon.alt = '';
		icon.width = 16;
		icon.height = 16;
		icon.loading = 'lazy';
		icon.referrerPolicy = 'no-referrer';
		header.appendChild(icon);
	}

	const site = document.createElement('span');
	site.className = 'penny-link-preview-popover__site';
	site.textContent = preview.siteName;
	header.appendChild(site);

	const title = document.createElement('p');
	title.className = 'penny-link-preview-popover__title';
	title.textContent = preview.title;

	popover.append(header, title);

	if (preview.description) {
		const description = document.createElement('p');
		description.className = 'penny-link-preview-popover__description';
		description.textContent = preview.description;
		popover.appendChild(description);
	}
}

function positionPopover(anchor: HTMLAnchorElement): void {
	const popover = ensurePopover();
	const anchorRect = anchor.getBoundingClientRect();
	const popoverRect = popover.getBoundingClientRect();

	let top = anchorRect.bottom + POPOVER_OFFSET_PX;
	let left = anchorRect.left;

	if (top + popoverRect.height > window.innerHeight - VIEWPORT_MARGIN_PX) {
		top = anchorRect.top - popoverRect.height - POPOVER_OFFSET_PX;
	}

	if (left + popoverRect.width > window.innerWidth - VIEWPORT_MARGIN_PX) {
		left = window.innerWidth - popoverRect.width - VIEWPORT_MARGIN_PX;
	}

	if (left < VIEWPORT_MARGIN_PX) {
		left = VIEWPORT_MARGIN_PX;
	}

	popover.style.top = `${Math.round(top)}px`;
	popover.style.left = `${Math.round(left)}px`;
}

export function destroyLinkPreviewPopoverForTests(): void {
	closePreview();
	popoverElement?.remove();
	popoverElement = null;
	clientCache.clear();
}
