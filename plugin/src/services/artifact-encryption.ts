import { deriveSessionContentKey, ENCRYPTION_MASTER_KEY_ENV, decryptUtf8, encryptUtf8, resolveMasterKeyFromEnv } from '@penny/shared/app-encryption';

export function artifactContentKey(sessionUuid: string): Buffer | null {
	const masterKey = resolveMasterKeyFromEnv(process.env[ENCRYPTION_MASTER_KEY_ENV] ?? null);
	if (!masterKey) {
		return null;
	}
	return deriveSessionContentKey(masterKey, sessionUuid);
}

export function encryptSessionTitle(title: string, sessionUuid: string): string {
	const contentKey = artifactContentKey(sessionUuid);
	if (!contentKey) {
		return title;
	}
	return encryptUtf8(title, contentKey);
}

export function decryptSessionTitle(title: string, sessionUuid: string | null): string {
	const contentKey = sessionUuid ? artifactContentKey(sessionUuid) : null;
	if (!contentKey) {
		return title;
	}
	try {
		return decryptUtf8(title, contentKey);
	} catch {
		return title;
	}
}
