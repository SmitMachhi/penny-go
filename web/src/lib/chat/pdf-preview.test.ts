import { describe, expect, it, vi } from 'vitest';

import { loadPdfObjectUrl } from './pdf-preview.js';

describe('loadPdfObjectUrl', () => {
	it('fetches a PDF once and returns an object URL', async () => {
		const blob = new Blob(['pdf'], { type: 'application/pdf' });
		const fetchPdf = vi.fn<typeof fetch>(async () =>
			new Response(blob, { headers: { 'content-type': 'application/pdf' } })
		);
		const createObjectUrl = vi.fn(() => 'blob:penny-preview');

		const result = await loadPdfObjectUrl({
			url: '/api/artifacts/brief?preview=pdf',
			fetchPdf,
			createObjectUrl,
			revokeObjectUrl: vi.fn()
		});

		expect(fetchPdf).toHaveBeenCalledOnce();
		expect(fetchPdf).toHaveBeenCalledWith('/api/artifacts/brief?preview=pdf', {
			credentials: 'same-origin'
		});
		expect(createObjectUrl).toHaveBeenCalledOnce();
		expect(createObjectUrl).toHaveBeenCalledWith(blob);
		expect(result.objectUrl).toBe('blob:penny-preview');
	});

	it('revokes the object URL when disposed', async () => {
		const fetchPdf = vi.fn<typeof fetch>(async () =>
			new Response(new Blob(['pdf'], { type: 'application/pdf' }), {
				headers: { 'content-type': 'application/pdf' }
			})
		);
		const revokeObjectUrl = vi.fn();

		const result = await loadPdfObjectUrl({
			url: '/api/artifacts/brief?preview=pdf',
			fetchPdf,
			createObjectUrl: () => 'blob:penny-preview',
			revokeObjectUrl
		});
		result.revoke();

		expect(revokeObjectUrl).toHaveBeenCalledWith('blob:penny-preview');
	});
});
