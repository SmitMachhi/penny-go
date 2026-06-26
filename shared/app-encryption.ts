import { createDecipheriv, createCipheriv, hkdfSync, randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

export const ENCRYPTION_MASTER_KEY_ENV = 'PENNY_ENCRYPTION_MASTER_KEY';
export const ENCRYPTION_ENVELOPE_PREFIX = 'penny-enc-v1:';
export const SESSION_KEY_INFO = 'penny-session-content-v1';
export const USER_METADATA_KEY_INFO = 'penny-user-metadata-v1';
const AES_GCM_IV_BYTES = 12;
const AES_GCM_TAG_BYTES = 16;
const CONTENT_KEY_BYTES = 32;

export function resolveMasterKeyFromEnv(envValue?: string | null): Buffer | null {
	const raw = envValue?.trim();
	if (!raw) {
		return null;
	}
	const key = Buffer.from(raw, 'base64url');
	if (key.length !== CONTENT_KEY_BYTES) {
		throw new Error(`${ENCRYPTION_MASTER_KEY_ENV} must decode to ${CONTENT_KEY_BYTES} bytes`);
	}
	return key;
}

export function deriveSessionContentKey(masterKey: Buffer, sessionUuid: string): Buffer {
	return Buffer.from(
		hkdfSync('sha256', masterKey, sessionUuid, SESSION_KEY_INFO, CONTENT_KEY_BYTES)
	);
}

export function deriveUserMetadataKey(masterKey: Buffer, userId: string): Buffer {
	return Buffer.from(hkdfSync('sha256', masterKey, userId, USER_METADATA_KEY_INFO, CONTENT_KEY_BYTES));
}

export function isEncryptedEnvelope(value: string): boolean {
	return value.startsWith(ENCRYPTION_ENVELOPE_PREFIX);
}

export function encryptBytes(plaintext: Buffer, contentKey: Buffer): Buffer {
	const iv = randomBytes(AES_GCM_IV_BYTES);
	const cipher = createCipheriv('aes-256-gcm', contentKey, iv);
	const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
	const tag = cipher.getAuthTag();
	return Buffer.concat([iv, tag, ciphertext]);
}

export function decryptBytes(payload: Buffer, contentKey: Buffer): Buffer {
	if (payload.length < AES_GCM_IV_BYTES + AES_GCM_TAG_BYTES + 1) {
		throw new Error('encrypted_payload_too_short');
	}
	const iv = payload.subarray(0, AES_GCM_IV_BYTES);
	const tag = payload.subarray(AES_GCM_IV_BYTES, AES_GCM_IV_BYTES + AES_GCM_TAG_BYTES);
	const ciphertext = payload.subarray(AES_GCM_IV_BYTES + AES_GCM_TAG_BYTES);
	const decipher = createDecipheriv('aes-256-gcm', contentKey, iv);
	decipher.setAuthTag(tag);
	return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function encryptUtf8(text: string, contentKey: Buffer): string {
	const payload = encryptBytes(Buffer.from(text, 'utf8'), contentKey);
	return `${ENCRYPTION_ENVELOPE_PREFIX}${payload.toString('base64url')}`;
}

export function decryptUtf8(envelope: string, contentKey: Buffer): string {
	if (!isEncryptedEnvelope(envelope)) {
		return envelope;
	}
	const encoded = envelope.slice(ENCRYPTION_ENVELOPE_PREFIX.length);
	return decryptBytes(Buffer.from(encoded, 'base64url'), contentKey).toString('utf8');
}

export async function readSecureTextFile(
	filePath: string,
	contentKey: Buffer | null
): Promise<string> {
	const raw = await readFile(filePath, 'utf8');
	if (!contentKey || !isEncryptedEnvelope(raw)) {
		return raw;
	}
	return decryptBytes(
		Buffer.from(raw.slice(ENCRYPTION_ENVELOPE_PREFIX.length), 'base64url'),
		contentKey
	).toString('utf8');
}

export async function writeSecureTextFile(
	filePath: string,
	text: string,
	contentKey: Buffer | null
): Promise<void> {
	if (!contentKey) {
		await writeFile(filePath, text, 'utf8');
		return;
	}
	const payload = encryptBytes(Buffer.from(text, 'utf8'), contentKey);
	await writeFile(filePath, `${ENCRYPTION_ENVELOPE_PREFIX}${payload.toString('base64url')}`, 'utf8');
}

export async function readSecureBinaryFile(
	filePath: string,
	contentKey: Buffer | null
): Promise<Buffer> {
	const raw = await readFile(filePath);
	if (!contentKey) {
		return raw;
	}
	const asText = raw.toString('utf8');
	if (!isEncryptedEnvelope(asText)) {
		return raw;
	}
	return decryptBytes(Buffer.from(asText.slice(ENCRYPTION_ENVELOPE_PREFIX.length), 'base64url'), contentKey);
}

export async function writeSecureBinaryFile(
	filePath: string,
	bytes: Buffer,
	contentKey: Buffer | null
): Promise<void> {
	if (!contentKey) {
		await writeFile(filePath, bytes);
		return;
	}
	const payload = encryptBytes(bytes, contentKey);
	await writeFile(filePath, `${ENCRYPTION_ENVELOPE_PREFIX}${payload.toString('base64url')}`, 'utf8');
}
