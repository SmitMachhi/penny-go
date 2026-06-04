import {
	buildArtifactDownloadFilename,
	parseContentDispositionFilename
} from '@penny/shared/artifact-download-filename';

export async function downloadArtifactPdf(
	downloadHref: string,
	fallbackTitle: string,
	version: number
): Promise<void> {
	const response = await fetch(downloadHref);
	if (!response.ok) {
		throw new Error(`artifact_download_${response.status}`);
	}

	const blob = await response.blob();
	const filename =
		parseContentDispositionFilename(response.headers.get('Content-Disposition')) ??
		buildArtifactDownloadFilename(fallbackTitle, version);

	const objectUrl = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = objectUrl;
	anchor.download = filename;
	anchor.rel = 'noopener';
	document.body.append(anchor);
	anchor.click();
	anchor.remove();
	URL.revokeObjectURL(objectUrl);
}
