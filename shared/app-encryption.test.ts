import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
	decryptUtf8,
	deriveSessionContentKey,
	encryptUtf8,
	isEncryptedEnvelope,
	readSecureTextFile,
	resolveMasterKeyFromEnv,
	writeSecureTextFile
} from './app-encryption.ts';

test('resolveMasterKeyFromEnv accepts 32-byte base64url keys', () => {
	const key = randomBytes(32);
	assert.deepEqual(resolveMasterKeyFromEnv(key.toString('base64url')), key);
	assert.equal(resolveMasterKeyFromEnv(''), null);
});

test('encryptUtf8 round-trips session content', () => {
	const masterKey = randomBytes(32);
	const contentKey = deriveSessionContentKey(masterKey, '2551ea25-553e-483c-8c12-58e37a3c95f4');
	const envelope = encryptUtf8('cabinet shop in Kelowna', contentKey);
	assert.equal(isEncryptedEnvelope(envelope), true);
	assert.equal(decryptUtf8(envelope, contentKey), 'cabinet shop in Kelowna');
});

test('decryptUtf8 returns plaintext when envelope is absent', () => {
	const contentKey = deriveSessionContentKey(randomBytes(32), 'session');
	assert.equal(decryptUtf8('plain title', contentKey), 'plain title');
});

test('writeSecureTextFile encrypts and readSecureTextFile decrypts', async () => {
	const dir = await mkdtemp(join(tmpdir(), 'penny-enc-'));
	const filePath = join(dir, 'ledger.json');
	const contentKey = deriveSessionContentKey(randomBytes(32), 'session-uuid');
	try {
		await writeSecureTextFile(filePath, '{"message":"hello"}\n', contentKey);
		const stored = await readFile(filePath, 'utf8');
		assert.match(stored, /^penny-enc-v1:/);
		assert.equal(await readSecureTextFile(filePath, contentKey), '{"message":"hello"}\n');
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
});
