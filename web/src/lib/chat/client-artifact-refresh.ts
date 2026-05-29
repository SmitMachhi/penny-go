const ARTIFACT_REFRESH_MAX_ATTEMPTS = 10;
const ARTIFACT_REFRESH_DELAY_MS = 300;

type RefreshArtifactInput = {
	hasArtifacts: () => boolean;
	loadArtifacts: () => Promise<void>;
	syncLatestArtifact: () => void;
};

export async function refreshArtifactsUntilReady(input: RefreshArtifactInput): Promise<void> {
	for (let attempt = 0; attempt < ARTIFACT_REFRESH_MAX_ATTEMPTS; attempt += 1) {
		await input.loadArtifacts();
		if (input.hasArtifacts()) {
			input.syncLatestArtifact();
			return;
		}
		await delay(ARTIFACT_REFRESH_DELAY_MS * (attempt + 1));
	}
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}
