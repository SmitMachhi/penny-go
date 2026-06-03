import { readFile } from 'node:fs/promises';

import { RENDER_SLIDES_PDF_TIMEOUT_MS } from '../constants.js';
import { resolvePython, resolveRepoRoot, type PennyToolsConfigShape } from './penny-config.js';
import { runJsonStdinSubprocess } from './subprocess-json.js';

export function pdfRendererScriptPath(repoRoot: string): string {
	return `${repoRoot}/tools/render_document_pdf.py`;
}

export async function renderArtifactPdfFromHtml(
	config: PennyToolsConfigShape,
	htmlPath: string,
	pdfPath: string,
	signal?: AbortSignal | undefined
): Promise<{ success: boolean; error?: string }> {
	const repoRoot = resolveRepoRoot(config);
	const outcome = await runJsonStdinSubprocess({
		command: resolvePython(config),
		args: [pdfRendererScriptPath(repoRoot)],
		payload: { htmlPath, pdfPath },
		timeoutMs: RENDER_SLIDES_PDF_TIMEOUT_MS,
		signal
	});

	if (!outcome.parsed) {
		return {
			success: false,
			error: outcome.stderr || 'empty_or_invalid_stdout'
		};
	}

	const success = outcome.parsed.success === true;
	if (!success) {
		return {
			success: false,
			error: typeof outcome.parsed.error === 'string' ? outcome.parsed.error : 'pdf_render_failed'
		};
	}

	try {
		await readFile(pdfPath);
		return { success: true };
	} catch {
		return { success: false, error: 'pdf_missing_after_render' };
	}
}
