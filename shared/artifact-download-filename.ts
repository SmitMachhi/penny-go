const MAX_FILENAME_STEM_LENGTH = 80;

/** Safe filename stem for Content-Disposition and browser download attribute. */
export function buildArtifactDownloadFilename(title: string, version: number): string {
	const stem = title
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^\w\s-]/g, '')
		.trim()
		.replace(/\s+/g, '-')
		.toLowerCase()
		.slice(0, MAX_FILENAME_STEM_LENGTH);

	const base = stem.length > 0 ? stem : 'penny-funding-memo';
	return `${base}-v${version}.pdf`;
}

export function parseContentDispositionFilename(header: string | null): string | null {
	if (!header) {
		return null;
	}
	const quoted = header.match(/filename="([^"]+)"/i);
	if (quoted?.[1]) {
		return quoted[1];
	}
	const unquoted = header.match(/filename=([^;]+)/i);
	return unquoted?.[1]?.trim() ?? null;
}
