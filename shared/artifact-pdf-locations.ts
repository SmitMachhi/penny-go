import { copyFile, rm, stat } from 'node:fs/promises';

import {
	PDF_FILENAME,
	resolveArtifactFilePath,
	resolveArtifactVersionFilePath
} from './penny-paths.ts';

export type ArtifactPdfPathSet = {
	versionPath: string;
	legacyPath: string;
};

export function resolveArtifactPdfPaths(
	repoRoot: string,
	sessionUuid: string,
	artifactId: string,
	version: number
): ArtifactPdfPathSet {
	return {
		versionPath: resolveArtifactVersionFilePath(
			repoRoot,
			sessionUuid,
			artifactId,
			version,
			PDF_FILENAME
		),
		legacyPath: resolveArtifactFilePath(repoRoot, sessionUuid, artifactId, PDF_FILENAME)
	};
}

export async function isReadablePdfFile(filePath: string): Promise<boolean> {
	try {
		const fileStat = await stat(filePath);
		return fileStat.isFile() && fileStat.size > 0;
	} catch {
		return false;
	}
}

/** Copy root brief.pdf into versions/{n}/ when v5 layout is missing the PDF. */
export async function repairVersionPdfFromLegacy(paths: ArtifactPdfPathSet): Promise<boolean> {
	if (await isReadablePdfFile(paths.versionPath)) {
		await rm(paths.legacyPath, { force: true }).catch(() => undefined);
		return false;
	}

	if (!(await isReadablePdfFile(paths.legacyPath))) {
		return false;
	}

	await copyFile(paths.legacyPath, paths.versionPath);
	await rm(paths.legacyPath, { force: true }).catch(() => undefined);
	return true;
}

export async function resolveReadableArtifactPdfPath(
	paths: ArtifactPdfPathSet
): Promise<string | null> {
	if (await isReadablePdfFile(paths.versionPath)) {
		return paths.versionPath;
	}
	if (await isReadablePdfFile(paths.legacyPath)) {
		return paths.legacyPath;
	}
	return null;
}
