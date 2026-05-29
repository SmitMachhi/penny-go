const EMBEDDED_PREVIEW_STYLE = `<style data-penny-embedded>
html, body { height: 100%; margin: 0; }
.deck { min-height: 100%; height: 100%; }
.toolbar { display: none; }
.stage { min-height: 0; overflow: auto; }
</style>`;

export function injectEmbeddedPreviewStyles(html: string): string {
	if (html.includes('</head>')) {
		return html.replace('</head>', `${EMBEDDED_PREVIEW_STYLE}</head>`);
	}
	return `${EMBEDDED_PREVIEW_STYLE}${html}`;
}
