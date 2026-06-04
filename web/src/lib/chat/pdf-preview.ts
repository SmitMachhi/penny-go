export type PdfObjectUrl = {
	objectUrl: string;
	revoke: () => void;
};

type LoadPdfObjectUrlInput = {
	url: string;
	fetchPdf?: typeof fetch;
	createObjectUrl?: (blob: Blob) => string;
	revokeObjectUrl?: (url: string) => void;
};

export async function loadPdfObjectUrl(input: LoadPdfObjectUrlInput): Promise<PdfObjectUrl> {
	const fetchPdf = input.fetchPdf ?? fetch;
	const createObjectUrl = input.createObjectUrl ?? URL.createObjectURL;
	const revokeObjectUrl = input.revokeObjectUrl ?? URL.revokeObjectURL;
	const response = await fetchPdf(input.url, { credentials: 'same-origin' });
	if (!response.ok) {
		throw new Error(`pdf_fetch_${response.status}`);
	}
	const contentType = response.headers.get('content-type') ?? '';
	if (!contentType.includes('pdf')) {
		throw new Error('pdf_invalid_content_type');
	}
	const blob = await response.blob();
	if (blob.size === 0) {
		throw new Error('pdf_empty');
	}
	const objectUrl = createObjectUrl(blob);
	return {
		objectUrl,
		revoke: () => revokeObjectUrl(objectUrl)
	};
}
