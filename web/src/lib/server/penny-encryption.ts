import {
	deriveSessionContentKey,
	ENCRYPTION_MASTER_KEY_ENV,
	resolveMasterKeyFromEnv
} from '@penny/shared/app-encryption';
import { parsePennySessionUuid } from '@penny/shared/session-key';

export function resolvePennyMasterKey(): Buffer | null {
	return resolveMasterKeyFromEnv(process.env[ENCRYPTION_MASTER_KEY_ENV] ?? null);
}

export function sessionContentKeyFor(sessionKey: string): Buffer | null {
	const masterKey = resolvePennyMasterKey();
	const sessionUuid = parsePennySessionUuid(sessionKey);
	if (!masterKey || !sessionUuid) {
		return null;
	}
	return deriveSessionContentKey(masterKey, sessionUuid);
}

export function sessionContentKeyForUuid(sessionUuid: string): Buffer | null {
	const masterKey = resolvePennyMasterKey();
	if (!masterKey) {
		return null;
	}
	return deriveSessionContentKey(masterKey, sessionUuid);
}
