export type ArtifactSummary = {
	artifactId: string;
	title: string;
	programCount: number;
	/** Latest memo version (alias kept for existing clients). */
	version: number;
	latestVersion: number;
	updatedAt: string;
	pdfAvailable: boolean;
};

export type ArtifactVersionSummary = {
	version: number;
	title: string;
	updatedAt: string;
	pdfAvailable: boolean;
	changeSummary?: string;
};

export type ArtifactDetailResponse = {
	artifact: ArtifactSummary;
	versions: ArtifactVersionSummary[];
};

export type ArtifactsResponse = {
	artifacts: ArtifactSummary[];
};

export function artifactChipLabel(artifact: ArtifactSummary): string {
	return `${artifact.title} · ${artifact.programCount} program${artifact.programCount === 1 ? '' : 's'}`;
}
