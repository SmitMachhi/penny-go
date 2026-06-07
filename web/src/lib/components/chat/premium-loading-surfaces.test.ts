import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const CHAT_COMPONENT_DIR = fileURLToPath(new URL('.', import.meta.url));
const ARTIFACT_COMPONENT_DIR = fileURLToPath(new URL('../artifacts/', import.meta.url));
const UI_COMPONENT_DIR = fileURLToPath(new URL('../ui/', import.meta.url));

async function readChatComponent(filename: string): Promise<string> {
	return readFile(new URL(filename, `file://${CHAT_COMPONENT_DIR}`), 'utf8');
}

async function readArtifactComponent(filename: string): Promise<string> {
	return readFile(new URL(filename, `file://${ARTIFACT_COMPONENT_DIR}`), 'utf8');
}

async function componentExists(baseDir: string, filename: string): Promise<boolean> {
	try {
		await access(new URL(filename, `file://${baseDir}`));
		return true;
	} catch {
		return false;
	}
}

describe('premium loading surfaces', () => {
	it('centralizes shimmer primitives in a shared UI component', async () => {
		expect(await componentExists(UI_COMPONENT_DIR, 'LoadingSurface.svelte')).toBe(true);
	});

	it('uses a conversation-shaped skeleton instead of plain loading copy', async () => {
		const source = await readChatComponent('ChatView.svelte');

		expect(source).toContain('ConversationSkeleton');
		expect(source).not.toContain('Loading conversation…');
	});

	it('uses a document-shaped preview skeleton instead of plain memo loading copy', async () => {
		const source = await readArtifactComponent('DocumentPreview.svelte');

		expect(source).toContain('DocumentPreviewSkeleton');
		expect(source).not.toContain('Loading memo…');
	});

	it('shows an immediate chat-shaped launch state from the home screen', async () => {
		const source = await readChatComponent('HomeView.svelte');

		expect(source).toContain('PendingStartSurface');
		expect(source).toContain('startingMessage');
	});

	it('uses dynamic viewport shell sizing for mobile stability', async () => {
		const source = await readChatComponent('PennyShell.svelte');

		expect(source).toContain('min-h-[100dvh]');
		expect(source).not.toContain('h-screen');
	});

	it('keeps gateway status visible in the header', async () => {
		const source = await readChatComponent('PennyShell.svelte');

		expect(source).toContain('connectionStatusLabel');
		expect(source).toContain('Checking');
		expect(source).toContain('Online');
		expect(source).toContain('Working');
		expect(source).toContain('Offline');
	});

	it('does not render a manual gateway retry button', async () => {
		const source = await readChatComponent('PennyShell.svelte');

		expect(source).not.toContain('Retry');
		expect(source).not.toContain('chat.refreshHealth()}');
	});
});
