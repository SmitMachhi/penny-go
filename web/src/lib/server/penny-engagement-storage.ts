import { unlink } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

import { resolveWorkspaceRoot } from '$lib/server/penny-config.js';
import { parsePennySessionUuid } from '$lib/server/session-key.js';

export function engagementMemoryPath(
	sessionKey: string,
	workspaceRoot = resolveWorkspaceRoot()
): string | null {
	const uuid = parsePennySessionUuid(sessionKey);
	if (!uuid) {
		return null;
	}

	const engagementsDir = resolve(workspaceRoot, 'memory', 'engagements');
	const target = resolve(engagementsDir, `${uuid}.md`);
	const relativePath = relative(engagementsDir, target);
	if (relativePath.startsWith('..') || relativePath.includes('..')) {
		return null;
	}

	return target;
}

export async function deleteEngagementMemory(sessionKey: string): Promise<void> {
	const memoryPath = engagementMemoryPath(sessionKey);
	if (!memoryPath) {
		return;
	}

	try {
		await unlink(memoryPath);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
			throw error;
		}
	}
}
