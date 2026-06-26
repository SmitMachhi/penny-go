import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ENCRYPTION_ENVELOPE_PREFIX, ENCRYPTION_MASTER_KEY_ENV } from '@penny/shared/app-encryption';
import { buildPennySessionKey } from '@penny/shared/session-key';

const SESSION_UUID = '2551ea25-553e-483c-8c12-58e37a3c95f4';
const SESSION_KEY = buildPennySessionKey(SESSION_UUID);
const SESSION_ID = '5593eedf-cb0a-4927-b859-0474aaeee22a';
const MASTER_KEY = randomBytes(32).toString('base64url');

describe('openclaw transcript encryption', () => {
	let stateDir = '';

	beforeEach(async () => {
		stateDir = await mkdtemp(join(tmpdir(), 'openclaw-state-'));
		process.env.OPENCLAW_STATE_DIR = stateDir;
		process.env.PENNY_ENCRYPTION_MASTER_KEY = MASTER_KEY;
		vi.resetModules();
	});

	afterEach(async () => {
		delete process.env.OPENCLAW_STATE_DIR;
		delete process.env.PENNY_ENCRYPTION_MASTER_KEY;
		await rm(stateDir, { recursive: true, force: true });
	});

	it('encrypts and decrypts transcript files between turns', async () => {
		const sessionsDir = join(stateDir, 'agents', 'main', 'sessions');
		await mkdir(sessionsDir, { recursive: true });
		const transcriptPath = join(sessionsDir, `${SESSION_ID}.jsonl`);
		await writeFile(
			join(sessionsDir, 'sessions.json'),
			JSON.stringify({
				[SESSION_KEY]: {
					sessionId: SESSION_ID,
					sessionFile: transcriptPath
				}
			}),
			'utf8'
		);
		await writeFile(transcriptPath, '{"type":"session","version":3,"id":"x"}\n', 'utf8');

		const encryption = await import('./openclaw-transcript-encryption.js');
		await encryption.encryptSessionTranscriptAtRest(SESSION_KEY);
		const encrypted = await readFile(transcriptPath, 'utf8');
		expect(encrypted.startsWith(ENCRYPTION_ENVELOPE_PREFIX)).toBe(true);

		await encryption.ensureSessionTranscriptPlaintext(SESSION_KEY);
		const plaintext = await readFile(transcriptPath, 'utf8');
		expect(plaintext).toContain('"type":"session"');
	});
});
