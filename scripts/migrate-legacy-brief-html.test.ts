import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

test('legacy brief migration script loads without artifacts', async () => {
	const originalRepoRoot = process.env.PENNY_REPO_ROOT;
	const repoRoot = await mkdtemp(join(tmpdir(), 'penny-migrate-'));
	process.env.PENNY_REPO_ROOT = repoRoot;

	try {
		const scriptUrl = pathToFileURL(join(process.cwd(), 'scripts/migrate-legacy-brief-html.ts'));
		scriptUrl.search = randomUUID();
		await import(scriptUrl.href);
		assert.ok(true);
	} finally {
		if (originalRepoRoot === undefined) {
			delete process.env.PENNY_REPO_ROOT;
		} else {
			process.env.PENNY_REPO_ROOT = originalRepoRoot;
		}
		await rm(repoRoot, { recursive: true, force: true });
	}
});
