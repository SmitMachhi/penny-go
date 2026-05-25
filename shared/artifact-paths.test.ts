import assert from 'node:assert/strict';
import test from 'node:test';

import {
	resolveArtifactDir,
	resolveSessionArtifactIndexPath,
	resolveSessionArtifactsDir
} from './penny-paths.ts';

const REPO_ROOT = '/tmp/penny-go';
const SESSION_UUID = '550e8400-e29b-41d4-a716-446655440000';
const ARTIFACT_ID = '6ba7b814-9dad-41d4-a716-446655440000';

test('artifact path helpers resolve under workspace artifacts', () => {
	const sessionDir = resolveSessionArtifactsDir(REPO_ROOT, SESSION_UUID);
	assert.equal(
		sessionDir,
		'/tmp/penny-go/workspace/artifacts/550e8400-e29b-41d4-a716-446655440000'
	);

	const artifactDir = resolveArtifactDir(REPO_ROOT, SESSION_UUID, ARTIFACT_ID);
	assert.equal(
		artifactDir,
		'/tmp/penny-go/workspace/artifacts/550e8400-e29b-41d4-a716-446655440000/6ba7b814-9dad-41d4-a716-446655440000'
	);

	const indexPath = resolveSessionArtifactIndexPath(REPO_ROOT, SESSION_UUID);
	assert.equal(
		indexPath,
		'/tmp/penny-go/workspace/artifacts/550e8400-e29b-41d4-a716-446655440000/index.json'
	);
});

test('artifact path helpers reject invalid session UUID', () => {
	assert.throws(() => resolveSessionArtifactsDir(REPO_ROOT, 'bad-id'), /invalid_session_uuid/);
});
