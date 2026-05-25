export type ArtifactSummary = {
	artifactId: string;
	title: string;
	programCount: number;
	version: number;
	updatedAt: string;
};

export type ArtifactsResponse = {
	sessionKey: string;
	artifacts: ArtifactSummary[];
};

export function artifactChipLabel(artifact: ArtifactSummary): string {
	return `${artifact.title} · ${artifact.programCount} program${artifact.programCount === 1 ? '' : 's'}`;
}
