# GDPR Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the next GDPR controls for Penny: user-facing privacy UI, full artifact/PDF export, Supabase account deletion policy, retention purge, and OpenClaw isolation proof.

**Architecture:** Keep Supabase RLS-backed session ownership as the authorization boundary for user-facing privacy actions. Use the existing privacy export/delete APIs as the backend control surface, add focused services for artifact export and retention, and prove OpenClaw isolation with source-grounded tests before changing gateway assumptions.

**Tech Stack:** SvelteKit, Svelte 5, TypeScript, Vitest, Supabase Auth/RLS, OpenClaw gateway, Node filesystem-backed workspace storage.

## Global Constraints

- Do not start any MCP server unless explicitly asked; context7 is the only auto-allowed MCP server.
- Strict TS: no `any`, unchecked casts, `var`, unused vars, or unsorted imports; default to `const`.
- Keep files <=500 LOC, functions <=50 LOC, complexity <=10, nesting <=3, and logic DRY.
- No secrets in code, logs, docs, tests, or commits.
- No magic numbers: name every numeric literal with a semantic constant.
- Penny stays agentic; deterministic code only frames tools, safety gates, and evidence constraints.
- Before implementing against OpenClaw, read its source with `/opt/homebrew/bin/opensrc path openclaw/openclaw`.
- Stage files explicitly by name; never use `git add .` or `git add -A`.
- Commit each verified logical change immediately with lowercase, <=6-word, ironic commit messages and no trailers.
- Out of scope for this plan: subprocessors/SCC register and DPIA screening.

---

## File Structure

- `web/src/lib/server/privacy-data.ts`: Extend the current export service to include full artifact document text and PDF availability metadata.
- `web/src/lib/server/privacy-data.test.ts`: Add export coverage for full artifact content.
- `web/src/lib/server/privacy-artifact-export.ts`: New focused reader for per-session artifact documents and PDF metadata.
- `web/src/lib/server/privacy-artifact-export.test.ts`: Unit tests for artifact document/PDF export shape and invalid/missing files.
- `web/src/lib/privacy/client.ts`: New browser helper for privacy export and deletion requests.
- `web/src/lib/privacy/client.test.ts`: Unit tests for the browser helper request/response behavior.
- `web/src/lib/components/privacy/PrivacyPanel.svelte`: New authenticated UI for exporting data and deleting Penny data.
- `web/src/lib/components/privacy/PrivacyPanel.test.ts`: Markup-focused tests for the privacy UI states.
- `web/src/lib/components/chat/SessionSidebar.svelte`: Add a compact Privacy entry point near sign out.
- `web/src/lib/server/retention-policy.ts`: Retention policy constants and cutoff calculation.
- `web/src/lib/server/retention-purge.ts`: Retention purge service for stale owned session/workspace data.
- `web/src/lib/server/retention-purge.test.ts`: Tests for cutoff behavior and deletion calls.
- `scripts/purge-retained-penny-data.ts`: CLI entrypoint for scheduled retention purge.
- `scripts/purge-retained-penny-data.test.ts`: CLI parsing and dry-run tests.
- `docs/security/gdpr-readiness.md`: Update status rows after each implemented control.
- `docs/security/openclaw-isolation-proof.md`: New source-grounded proof note for OpenClaw session isolation assumptions and remaining risks.
- `web/src/lib/server/openclaw-isolation-proof.test.ts`: Regression tests for app-side OpenClaw isolation assumptions.
- `supabase/migrations/20260625210000_privacy_account_deletion_requests.sql`: Add a user-scoped account deletion request table if full auth-user deletion remains operational/manual.
- `web/src/lib/server/account-deletion-policy.ts`: App policy service for requesting account deletion without requiring a service-role key in the web app.
- `web/src/lib/server/account-deletion-policy.test.ts`: Tests for account deletion request recording.
- `web/src/routes/api/privacy/account-delete/+server.ts`: Authenticated account deletion request endpoint.

---

### Task 1: Full Artifact Export Backend

**Files:**
- Create: `web/src/lib/server/privacy-artifact-export.ts`
- Create: `web/src/lib/server/privacy-artifact-export.test.ts`
- Modify: `web/src/lib/server/privacy-data.ts`
- Modify: `web/src/lib/server/privacy-data.test.ts`
- Modify: `docs/security/gdpr-readiness.md`

**Interfaces:**
- Consumes: `listSessionArtifacts(sessionKey: string)`, `readArtifactPdfBytes(sessionKey, artifactId, version)`, `getArtifactDetail(sessionKey, artifactId)`.
- Produces:

```ts
export type PrivacyArtifactExport = {
	artifactId: string;
	documentMarkdown: string | null;
	latestVersion: number;
	pdfAvailable: boolean;
	pdfByteLength: number | null;
	title: string;
	versions: { version: number; pdfAvailable: boolean; pdfByteLength: number | null }[];
};

export async function exportSessionArtifactsForPrivacy(
	sessionKey: string
): Promise<PrivacyArtifactExport[]>;
```

- [ ] **Step 1: Write failing tests for artifact export**

Create `web/src/lib/server/privacy-artifact-export.test.ts`:

```ts
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
	META_FILENAME,
	resolveArtifactDir,
	resolveArtifactFilePath,
	resolveArtifactVersionDir
} from '@penny/shared/penny-paths';

import { exportSessionArtifactsForPrivacy } from './privacy-artifact-export.js';

const SESSION_UUID = '550e8400-e29b-41d4-a716-446655440000';
const SESSION_KEY = `agent:main:penny:${SESSION_UUID}`;
const ARTIFACT_ID = '6ba7b814-9dad-41d4-a716-446655440000';
const PDF_BYTES = '%PDF-1.4 privacy export';

let repoRoot = '';
let previousRepoRoot: string | undefined;

describe('exportSessionArtifactsForPrivacy', () => {
	beforeEach(async () => {
		previousRepoRoot = process.env.PENNY_REPO_ROOT;
		repoRoot = await mkdtemp(join(tmpdir(), 'penny-privacy-artifacts-'));
		process.env.PENNY_REPO_ROOT = repoRoot;

		const artifactDir = resolveArtifactDir(repoRoot, SESSION_UUID, ARTIFACT_ID);
		const versionDir = resolveArtifactVersionDir(repoRoot, SESSION_UUID, ARTIFACT_ID, 1);
		await writeFile(resolveArtifactFilePath(repoRoot, SESSION_UUID, ARTIFACT_ID, 'document.md'), '# Funding plan\n', 'utf8');
		await writeFile(resolveArtifactFilePath(repoRoot, SESSION_UUID, ARTIFACT_ID, META_FILENAME), `${JSON.stringify({
			artifactId: ARTIFACT_ID,
			createdAt: '2026-06-25T18:00:00.000Z',
			latestVersion: 1,
			pdfAvailable: true,
			programCount: 1,
			sessionUuid: SESSION_UUID,
			title: 'Funding plan',
			triggerReason: 'user requested plan',
			updatedAt: '2026-06-25T18:00:00.000Z'
		})}\n`, 'utf8');
		await writeFile(join(artifactDir, 'index.json'), '[]\n', 'utf8');
		await writeFile(join(versionDir, 'brief.pdf'), PDF_BYTES, 'utf8');
	});

	afterEach(async () => {
		if (previousRepoRoot === undefined) {
			delete process.env.PENNY_REPO_ROOT;
		} else {
			process.env.PENNY_REPO_ROOT = previousRepoRoot;
		}
		await rm(repoRoot, { force: true, recursive: true });
	});

	it('exports document markdown and pdf byte lengths for owned session artifacts', async () => {
		const exported = await exportSessionArtifactsForPrivacy(SESSION_KEY);

		expect(exported).toEqual([
			{
				artifactId: ARTIFACT_ID,
				documentMarkdown: '# Funding plan\n',
				latestVersion: 1,
				pdfAvailable: true,
				pdfByteLength: PDF_BYTES.length,
				title: 'Funding plan',
				versions: [{ version: 1, pdfAvailable: true, pdfByteLength: PDF_BYTES.length }]
			}
		]);
	});

	it('returns an empty export for invalid session keys', async () => {
		await expect(exportSessionArtifactsForPrivacy('agent:main:main')).resolves.toEqual([]);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix web test -- privacy-artifact-export.test.ts`

Expected: FAIL with module not found for `privacy-artifact-export.js`.

- [ ] **Step 3: Implement artifact export reader**

Create `web/src/lib/server/privacy-artifact-export.ts`:

```ts
import { readFile } from 'node:fs/promises';

import {
	DOCUMENT_MD_FILENAME,
	resolveArtifactFilePath
} from '@penny/shared/penny-paths';

import {
	getArtifactDetail,
	listSessionArtifacts,
	readArtifactPdfBytes
} from '$lib/server/artifact-storage.js';
import { parsePennySessionUuid } from '$lib/server/session-key.js';
import { resolvePennyRepoRootFromEnv } from '$lib/server/penny-config.js';

export type PrivacyArtifactVersionExport = {
	pdfAvailable: boolean;
	pdfByteLength: number | null;
	version: number;
};

export type PrivacyArtifactExport = {
	artifactId: string;
	documentMarkdown: string | null;
	latestVersion: number;
	pdfAvailable: boolean;
	pdfByteLength: number | null;
	title: string;
	versions: PrivacyArtifactVersionExport[];
};

async function readDocumentMarkdown(
	repoRoot: string,
	sessionUuid: string,
	artifactId: string
): Promise<string | null> {
	try {
		return await readFile(
			resolveArtifactFilePath(repoRoot, sessionUuid, artifactId, DOCUMENT_MD_FILENAME),
			'utf8'
		);
	} catch {
		return null;
	}
}

async function readPdfByteLength(
	sessionKey: string,
	artifactId: string,
	version: number
): Promise<number | null> {
	try {
		return (await readArtifactPdfBytes(sessionKey, artifactId, version)).byteLength;
	} catch {
		return null;
	}
}

export async function exportSessionArtifactsForPrivacy(
	sessionKey: string
): Promise<PrivacyArtifactExport[]> {
	const sessionUuid = parsePennySessionUuid(sessionKey);
	if (!sessionUuid) {
		return [];
	}

	const repoRoot = resolvePennyRepoRootFromEnv();
	const artifacts = await listSessionArtifacts(sessionKey);
	const exported: PrivacyArtifactExport[] = [];

	for (const artifact of artifacts) {
		const detail = await getArtifactDetail(sessionKey, artifact.artifactId);
		const versions = await Promise.all(
			(detail?.versions ?? []).map(async (version) => ({
				pdfAvailable: version.pdfAvailable,
				pdfByteLength: await readPdfByteLength(sessionKey, artifact.artifactId, version.version),
				version: version.version
			}))
		);
		exported.push({
			artifactId: artifact.artifactId,
			documentMarkdown: await readDocumentMarkdown(repoRoot, sessionUuid, artifact.artifactId),
			latestVersion: artifact.latestVersion,
			pdfAvailable: artifact.pdfAvailable,
			pdfByteLength: await readPdfByteLength(sessionKey, artifact.artifactId, artifact.latestVersion),
			title: artifact.title,
			versions
		});
	}

	return exported;
}
```

- [ ] **Step 4: Run artifact export tests**

Run: `npm --prefix web test -- privacy-artifact-export.test.ts`

Expected: PASS.

- [ ] **Step 5: Integrate full artifacts into privacy export**

Modify `web/src/lib/server/privacy-data.ts`:

```ts
import {
	exportSessionArtifactsForPrivacy,
	type PrivacyArtifactExport
} from '$lib/server/privacy-artifact-export.js';
```

Extend `PrivacySessionExport`:

```ts
	fullArtifacts: PrivacyArtifactExport[];
```

Add optional input:

```ts
	fullArtifactReader?: typeof exportSessionArtifactsForPrivacy;
```

Inside `exportPennyPrivacyData`:

```ts
const fullArtifactReader = input.fullArtifactReader ?? exportSessionArtifactsForPrivacy;
```

Change the per-session `Promise.all`:

```ts
const [history, artifacts, fullArtifacts, turns] = await Promise.all([
	historyReader({ ownershipStore: input.registry, sessionKey: session.key }),
	artifactsReader({ ownershipStore: input.registry, sessionKey: session.key }),
	fullArtifactReader(session.key),
	turnReader(session.key)
]);
```

Push:

```ts
exportedSessions.push({
	artifacts: artifacts.artifacts,
	fullArtifacts,
	history,
	session,
	turns
});
```

- [ ] **Step 6: Update privacy data test**

In `web/src/lib/server/privacy-data.test.ts`, add:

```ts
const fullArtifactReader = vi.fn(async () => [
	{
		artifactId: '6ba7b814-9dad-41d4-a716-446655440000',
		documentMarkdown: '# Funding plan\n',
		latestVersion: 1,
		pdfAvailable: true,
		pdfByteLength: 24,
		title: 'Funding plan',
		versions: [{ version: 1, pdfAvailable: true, pdfByteLength: 24 }]
	}
]);
```

Pass `fullArtifactReader` to `exportPennyPrivacyData` and assert:

```ts
expect(exported.sessions[0]?.fullArtifacts[0]?.documentMarkdown).toBe('# Funding plan\n');
expect(fullArtifactReader).toHaveBeenCalledWith(SESSION_KEY);
```

- [ ] **Step 7: Update GDPR readiness doc**

In `docs/security/gdpr-readiness.md`, change the artifact export gap from summaries-only to full markdown/PDF metadata exported. Keep a remaining note that raw PDF bytes are represented by byte length unless product wants bundled downloads.

- [ ] **Step 8: Verify full artifact export slice**

Run:

```bash
npm --prefix web test -- privacy-artifact-export.test.ts privacy-data.test.ts
npm --prefix web run check
```

Expected: both commands pass.

- [ ] **Step 9: Commit**

```bash
git add web/src/lib/server/privacy-artifact-export.ts web/src/lib/server/privacy-artifact-export.test.ts web/src/lib/server/privacy-data.ts web/src/lib/server/privacy-data.test.ts docs/security/gdpr-readiness.md
git commit -m "pdfs bring receipts"
```

---

### Task 2: User-Facing Privacy UI

**Files:**
- Create: `web/src/lib/privacy/client.ts`
- Create: `web/src/lib/privacy/client.test.ts`
- Create: `web/src/lib/components/privacy/PrivacyPanel.svelte`
- Create: `web/src/lib/components/privacy/PrivacyPanel.test.ts`
- Modify: `web/src/lib/components/chat/SessionSidebar.svelte`
- Modify: `docs/security/gdpr-readiness.md`

**Interfaces:**
- Consumes: `GET /api/privacy/export`, `POST /api/privacy/delete`.
- Produces:

```ts
export async function downloadPrivacyExport(fetcher?: typeof fetch): Promise<void>;
export async function deletePennyPrivacyData(fetcher?: typeof fetch): Promise<{ deletedSessionCount: number }>;
```

- [ ] **Step 1: Write failing client tests**

Create `web/src/lib/privacy/client.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

import {
	deletePennyPrivacyData,
	readPrivacyExport
} from './client.js';

describe('privacy client', () => {
	it('reads privacy export json', async () => {
		const fetcher = vi.fn(async () => new Response(JSON.stringify({ sessions: [] }), { status: 200 }));

		await expect(readPrivacyExport(fetcher)).resolves.toEqual({ sessions: [] });
		expect(fetcher).toHaveBeenCalledWith('/api/privacy/export', { method: 'GET' });
	});

	it('sends required confirmation for deletion', async () => {
		const fetcher = vi.fn(async () =>
			new Response(JSON.stringify({ deletedSessionCount: 2 }), { status: 200 })
		);

		await expect(deletePennyPrivacyData(fetcher)).resolves.toEqual({ deletedSessionCount: 2 });
		expect(fetcher).toHaveBeenCalledWith('/api/privacy/delete', {
			body: JSON.stringify({ confirm: 'DELETE_MY_PENNY_DATA' }),
			headers: { 'content-type': 'application/json' },
			method: 'POST'
		});
	});
});
```

- [ ] **Step 2: Run client tests to verify failure**

Run: `npm --prefix web test -- client.test.ts`

Expected: FAIL with missing `client.js`.

- [ ] **Step 3: Implement privacy client**

Create `web/src/lib/privacy/client.ts`:

```ts
const DELETE_CONFIRMATION = 'DELETE_MY_PENNY_DATA';
const EXPORT_ENDPOINT = '/api/privacy/export';
const DELETE_ENDPOINT = '/api/privacy/delete';
const JSON_CONTENT_TYPE = 'application/json';

export async function readPrivacyExport(fetcher: typeof fetch = fetch): Promise<unknown> {
	const response = await fetcher(EXPORT_ENDPOINT, { method: 'GET' });
	if (!response.ok) {
		throw new Error(`privacy_export_${response.status}`);
	}
	return response.json() as Promise<unknown>;
}

export async function deletePennyPrivacyData(
	fetcher: typeof fetch = fetch
): Promise<{ deletedSessionCount: number }> {
	const response = await fetcher(DELETE_ENDPOINT, {
		body: JSON.stringify({ confirm: DELETE_CONFIRMATION }),
		headers: { 'content-type': JSON_CONTENT_TYPE },
		method: 'POST'
	});
	if (!response.ok) {
		throw new Error(`privacy_delete_${response.status}`);
	}
	const body = (await response.json()) as { deletedSessionCount?: unknown };
	return {
		deletedSessionCount:
			typeof body.deletedSessionCount === 'number' ? body.deletedSessionCount : 0
	};
}

export function privacyExportFilename(now = new Date()): string {
	return `penny-privacy-export-${now.toISOString().slice(0, 10)}.json`;
}
```

- [ ] **Step 4: Run client tests**

Run: `npm --prefix web test -- client.test.ts`

Expected: PASS.

- [ ] **Step 5: Write PrivacyPanel markup test**

Create `web/src/lib/components/privacy/PrivacyPanel.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';

import PrivacyPanel from './PrivacyPanel.svelte';

describe('PrivacyPanel', () => {
	it('renders export and delete controls', () => {
		const { body } = render(PrivacyPanel);

		expect(body).toContain('Export data');
		expect(body).toContain('Delete Penny data');
		expect(body).toContain('Privacy');
	});
});
```

- [ ] **Step 6: Implement PrivacyPanel**

Create `web/src/lib/components/privacy/PrivacyPanel.svelte`:

```svelte
<script lang="ts">
	import { Download, Shield, Trash2 } from '@lucide/svelte';

	import {
		deletePennyPrivacyData,
		privacyExportFilename,
		readPrivacyExport
	} from '$lib/privacy/client.js';
	import Button from '$lib/components/ui/button.svelte';

	const JSON_INDENT_SPACES = 2;

	let busy = $state<'delete' | 'export' | null>(null);
	let error = $state<string | null>(null);
	let message = $state<string | null>(null);

	function saveJsonFile(data: unknown): void {
		const blob = new Blob([`${JSON.stringify(data, null, JSON_INDENT_SPACES)}\n`], {
			type: 'application/json'
		});
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = privacyExportFilename();
		anchor.click();
		URL.revokeObjectURL(url);
	}

	async function handleExport(): Promise<void> {
		busy = 'export';
		error = null;
		message = null;
		try {
			saveJsonFile(await readPrivacyExport());
			message = 'Export ready.';
		} catch {
			error = 'Could not export privacy data.';
		} finally {
			busy = null;
		}
	}

	async function handleDelete(): Promise<void> {
		if (!confirm('Delete all Penny chats, artifacts, and workspace data for this account?')) {
			return;
		}
		busy = 'delete';
		error = null;
		message = null;
		try {
			const result = await deletePennyPrivacyData();
			message = `Deleted ${result.deletedSessionCount} Penny sessions.`;
			window.location.href = '/';
		} catch {
			error = 'Could not delete privacy data.';
		} finally {
			busy = null;
		}
	}
</script>

<section class="space-y-3 rounded-md border border-border bg-background p-3">
	<div class="flex items-center gap-2">
		<Shield class="h-4 w-4 text-primary" />
		<h2 class="text-sm font-semibold">Privacy</h2>
	</div>
	<div class="flex flex-col gap-2">
		<Button type="button" variant="outline" class="justify-start gap-2" disabled={busy !== null} onclick={() => void handleExport()}>
			<Download class="h-4 w-4" />
			{busy === 'export' ? 'Exporting…' : 'Export data'}
		</Button>
		<Button type="button" variant="ghost" class="justify-start gap-2 text-destructive" disabled={busy !== null} onclick={() => void handleDelete()}>
			<Trash2 class="h-4 w-4" />
			{busy === 'delete' ? 'Deleting…' : 'Delete Penny data'}
		</Button>
	</div>
	{#if message}
		<p class="text-xs text-muted-foreground">{message}</p>
	{/if}
	{#if error}
		<p class="text-xs text-destructive">{error}</p>
	{/if}
</section>
```

- [ ] **Step 7: Wire PrivacyPanel into sidebar**

Modify `web/src/lib/components/chat/SessionSidebar.svelte`:

Add import:

```ts
import PrivacyPanel from '$lib/components/privacy/PrivacyPanel.svelte';
```

Before the logout form:

```svelte
<div class="border-t border-border p-2">
	<PrivacyPanel />
</div>
```

- [ ] **Step 8: Run UI tests and check**

Run:

```bash
npm --prefix web test -- client.test.ts PrivacyPanel.test.ts
npm --prefix web run check
```

Expected: PASS.

- [ ] **Step 9: Update GDPR readiness doc**

Change `GDPR-004` status to say user-facing controls exist in the sidebar, with remaining UX polish/account-level deletion still open.

- [ ] **Step 10: Commit**

```bash
git add web/src/lib/privacy/client.ts web/src/lib/privacy/client.test.ts web/src/lib/components/privacy/PrivacyPanel.svelte web/src/lib/components/privacy/PrivacyPanel.test.ts web/src/lib/components/chat/SessionSidebar.svelte docs/security/gdpr-readiness.md
git commit -m "privacy gets buttons"
```

---

### Task 3: Supabase Account Deletion Policy

**Files:**
- Create: `supabase/migrations/20260625210000_privacy_account_deletion_requests.sql`
- Create: `web/src/lib/server/account-deletion-policy.ts`
- Create: `web/src/lib/server/account-deletion-policy.test.ts`
- Create: `web/src/routes/api/privacy/account-delete/+server.ts`
- Modify: `docs/security/gdpr-readiness.md`

**Interfaces:**
- Produces:

```ts
export async function requestAccountDeletion(input: {
	note?: string;
	requestedAt?: Date;
	userId: string;
	writer: AccountDeletionRequestWriter;
}): Promise<{ requestedAt: string; userId: string }>;
```

- [ ] **Step 1: Add Supabase migration**

Create `supabase/migrations/20260625210000_privacy_account_deletion_requests.sql`:

```sql
create table if not exists public.privacy_account_deletion_requests (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null default auth.uid(),
	status text not null default 'requested',
	note text,
	requested_at timestamptz not null default now(),
	completed_at timestamptz
);

alter table public.privacy_account_deletion_requests enable row level security;
alter table public.privacy_account_deletion_requests force row level security;

revoke all on table public.privacy_account_deletion_requests from anon;
revoke all on table public.privacy_account_deletion_requests from authenticated;
grant select, insert on table public.privacy_account_deletion_requests to authenticated;

drop policy if exists "privacy_account_deletion_requests_select_own"
	on public.privacy_account_deletion_requests;
create policy "privacy_account_deletion_requests_select_own"
	on public.privacy_account_deletion_requests
	for select
	to authenticated
	using (user_id = auth.uid());

drop policy if exists "privacy_account_deletion_requests_insert_own"
	on public.privacy_account_deletion_requests;
create policy "privacy_account_deletion_requests_insert_own"
	on public.privacy_account_deletion_requests
	for insert
	to authenticated
	with check (user_id = auth.uid());
```

- [ ] **Step 2: Write account deletion policy test**

Create `web/src/lib/server/account-deletion-policy.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

import { requestAccountDeletion } from './account-deletion-policy.js';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const NOW = new Date('2026-06-25T19:00:00.000Z');

describe('requestAccountDeletion', () => {
	it('records a user-scoped account deletion request', async () => {
		const writer = vi.fn(async () => undefined);

		const result = await requestAccountDeletion({
			note: 'delete account',
			requestedAt: NOW,
			userId: USER_ID,
			writer
		});

		expect(result).toEqual({ requestedAt: NOW.toISOString(), userId: USER_ID });
		expect(writer).toHaveBeenCalledWith({
			note: 'delete account',
			requested_at: NOW.toISOString(),
			user_id: USER_ID
		});
	});
});
```

- [ ] **Step 3: Implement policy service**

Create `web/src/lib/server/account-deletion-policy.ts`:

```ts
export type AccountDeletionRequestRow = {
	note?: string;
	requested_at: string;
	user_id: string;
};

export type AccountDeletionRequestWriter = (
	row: AccountDeletionRequestRow
) => Promise<void>;

export async function requestAccountDeletion(input: {
	note?: string;
	requestedAt?: Date;
	userId: string;
	writer: AccountDeletionRequestWriter;
}): Promise<{ requestedAt: string; userId: string }> {
	const requestedAt = (input.requestedAt ?? new Date()).toISOString();
	await input.writer({
		...(input.note ? { note: input.note } : {}),
		requested_at: requestedAt,
		user_id: input.userId
	});
	return { requestedAt, userId: input.userId };
}
```

- [ ] **Step 4: Add authenticated account deletion request route**

Create `web/src/routes/api/privacy/account-delete/+server.ts`:

```ts
import { withApiJsonEvent } from '$lib/server/api-handler.js';
import { requireUser } from '$lib/server/auth-context.js';
import { requestAccountDeletion } from '$lib/server/account-deletion-policy.js';

type AccountDeleteRequest = {
	note?: string;
};

async function readAccountDeleteRequest(request: Request): Promise<AccountDeleteRequest> {
	const body = (await request.json().catch(() => ({}))) as Partial<AccountDeleteRequest>;
	return {
		note: typeof body.note === 'string' ? body.note.slice(0, 500) : undefined
	};
}

export async function POST(event) {
	return withApiJsonEvent(
		event,
		async (requestEvent) => {
			const user = requireUser(requestEvent);
			const body = await readAccountDeleteRequest(requestEvent.request);
			return requestAccountDeletion({
				note: body.note,
				userId: user.id,
				writer: async (row) => {
					const { error } = await requestEvent.locals.supabase
						.from('privacy_account_deletion_requests')
						.insert(row);
					if (error) {
						throw new Error(error.message);
					}
				}
			});
		},
		'failed to request account deletion',
		{ timingName: 'account_delete' }
	);
}
```

- [ ] **Step 5: Run policy tests and check**

Run:

```bash
npm --prefix web test -- account-deletion-policy.test.ts
npm --prefix web run check
```

Expected: PASS.

- [ ] **Step 6: Document policy**

Update `docs/security/gdpr-readiness.md`:

- Account deletion is policy/request based, not direct Supabase Auth deletion from the public web runtime.
- Rationale: Supabase Auth admin deletion requires service-role privileges that must not be exposed to normal request handlers.
- Operational follow-up: build an admin-only worker/runbook to process the request table.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260625210000_privacy_account_deletion_requests.sql web/src/lib/server/account-deletion-policy.ts web/src/lib/server/account-deletion-policy.test.ts web/src/routes/api/privacy/account-delete/+server.ts docs/security/gdpr-readiness.md
git commit -m "accounts wait outside"
```

---

### Task 4: Retention Purge

**Files:**
- Create: `web/src/lib/server/retention-policy.ts`
- Create: `web/src/lib/server/retention-purge.ts`
- Create: `web/src/lib/server/retention-purge.test.ts`
- Create: `scripts/purge-retained-penny-data.ts`
- Create: `scripts/purge-retained-penny-data.test.ts`
- Modify: `docs/security/gdpr-readiness.md`

**Interfaces:**
- Produces:

```ts
export const DEFAULT_RETENTION_DAYS = 30;
export function retentionCutoffMs(now?: Date, retentionDays?: number): number;
export async function purgeRetainedPennyData(input: PurgeRetainedPennyDataInput): Promise<PurgeRetainedPennyDataResult>;
```

- [ ] **Step 1: Write retention policy tests**

Create `web/src/lib/server/retention-purge.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

import { retentionCutoffMs } from './retention-policy.js';
import { purgeRetainedPennyData } from './retention-purge.js';

const NOW = new Date('2026-06-25T20:00:00.000Z');
const OLD_SESSION = {
	isLegacy: false,
	key: 'agent:main:penny:550e8400-e29b-41d4-a716-446655440000',
	title: 'Old',
	titleStatus: 'ready' as const,
	updatedAt: Date.parse('2026-05-01T00:00:00.000Z')
};
const NEW_SESSION = {
	...OLD_SESSION,
	key: 'agent:main:penny:550e8400-e29b-41d4-a716-446655440001',
	title: 'New',
	updatedAt: Date.parse('2026-06-24T00:00:00.000Z')
};

describe('retention purge', () => {
	it('calculates cutoff from retention days', () => {
		expect(new Date(retentionCutoffMs(NOW, 30)).toISOString()).toBe('2026-05-26T20:00:00.000Z');
	});

	it('deletes sessions older than the cutoff', async () => {
		const deleter = vi.fn(async () => undefined);

		const result = await purgeRetainedPennyData({
			deleter,
			now: NOW,
			retentionDays: 30,
			sessions: [OLD_SESSION, NEW_SESSION]
		});

		expect(result).toEqual({
			cutoff: '2026-05-26T20:00:00.000Z',
			deletedSessionCount: 1,
			deletedSessionKeys: [OLD_SESSION.key],
			retentionDays: 30
		});
		expect(deleter).toHaveBeenCalledWith(OLD_SESSION.key);
	});
});
```

- [ ] **Step 2: Implement retention policy**

Create `web/src/lib/server/retention-policy.ts`:

```ts
export const DEFAULT_RETENTION_DAYS = 30;

const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MS_PER_SECOND = 1_000;
const MS_PER_DAY = HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;

export function retentionCutoffMs(
	now = new Date(),
	retentionDays = DEFAULT_RETENTION_DAYS
): number {
	return now.getTime() - retentionDays * MS_PER_DAY;
}
```

- [ ] **Step 3: Implement retention purge service**

Create `web/src/lib/server/retention-purge.ts`:

```ts
import type { PennySessionView } from '$lib/types/penny-session.js';
import {
	DEFAULT_RETENTION_DAYS,
	retentionCutoffMs
} from '$lib/server/retention-policy.js';

export type PurgeRetainedPennyDataInput = {
	deleter: (sessionKey: string) => Promise<void>;
	now?: Date;
	retentionDays?: number;
	sessions: PennySessionView[];
};

export type PurgeRetainedPennyDataResult = {
	cutoff: string;
	deletedSessionCount: number;
	deletedSessionKeys: string[];
	retentionDays: number;
};

export async function purgeRetainedPennyData(
	input: PurgeRetainedPennyDataInput
): Promise<PurgeRetainedPennyDataResult> {
	const now = input.now ?? new Date();
	const retentionDays = input.retentionDays ?? DEFAULT_RETENTION_DAYS;
	const cutoffMs = retentionCutoffMs(now, retentionDays);
	const deletedSessionKeys: string[] = [];

	for (const session of input.sessions) {
		if (session.updatedAt >= cutoffMs) {
			continue;
		}
		await input.deleter(session.key);
		deletedSessionKeys.push(session.key);
	}

	return {
		cutoff: new Date(cutoffMs).toISOString(),
		deletedSessionCount: deletedSessionKeys.length,
		deletedSessionKeys,
		retentionDays
	};
}
```

- [ ] **Step 4: Add CLI script**

Create `scripts/purge-retained-penny-data.ts`:

```ts
import { deletePennySession, listPennySessions } from '../web/src/lib/server/session-orchestration.js';
import { purgeRetainedPennyData } from '../web/src/lib/server/retention-purge.js';

const RETENTION_DAYS_ENV = 'PENNY_RETENTION_DAYS';
const DECIMAL_RADIX = 10;

function readRetentionDays(): number | undefined {
	const raw = process.env[RETENTION_DAYS_ENV]?.trim();
	if (!raw) {
		return undefined;
	}
	const parsed = Number.parseInt(raw, DECIMAL_RADIX);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

const result = await purgeRetainedPennyData({
	deleter: (sessionKey) => deletePennySession(sessionKey),
	retentionDays: readRetentionDays(),
	sessions: await listPennySessions()
});

console.log(JSON.stringify(result, null, 2));
```

- [ ] **Step 5: Run retention tests**

Run:

```bash
npm --prefix web test -- retention-purge.test.ts
npm --prefix web run check
```

Expected: PASS.

- [ ] **Step 6: Document scheduler/runbook**

Update `docs/security/gdpr-readiness.md`:

- Retention purge service exists.
- Production scheduler still needs a platform job, for example Fly cron or external scheduler.
- Default retention is 30 days unless `PENNY_RETENTION_DAYS` is set.

- [ ] **Step 7: Commit**

```bash
git add web/src/lib/server/retention-policy.ts web/src/lib/server/retention-purge.ts web/src/lib/server/retention-purge.test.ts scripts/purge-retained-penny-data.ts docs/security/gdpr-readiness.md
git commit -m "old chats retire"
```

---

### Task 5: OpenClaw Isolation Proof

**Files:**
- Create: `docs/security/openclaw-isolation-proof.md`
- Create: `web/src/lib/server/openclaw-isolation-proof.test.ts`
- Modify: `docs/security/gdpr-readiness.md`

**Interfaces:**
- Consumes: `assertOwnedPennySession`, route-level ownership patterns, OpenClaw source inspected via opensrc.
- Produces: A documented proof boundary and regression tests confirming app-side gateway calls only occur after ownership assertion.

- [ ] **Step 1: Resolve and inspect OpenClaw source**

Run:

```bash
OPENCLAW_SRC="$(/opt/homebrew/bin/opensrc path openclaw/openclaw)"
nl -ba "$OPENCLAW_SRC/packages/sdk/src/client.ts" | sed -n '656,686p'
nl -ba "$OPENCLAW_SRC/extensions/admin-http-rpc/src/methods.ts" | sed -n '1,63p'
nl -ba "$OPENCLAW_SRC/extensions/admin-http-rpc/src/handler.ts" | sed -n '161,237p'
nl -ba "$OPENCLAW_SRC/packages/sdk/src/index.e2e.test.ts" | sed -n '225,244p'
```

Expected: commands print OpenClaw SDK session methods, admin RPC allowlist/dispatch, and e2e session RPC examples.

- [ ] **Step 2: Inspect app gateway manifest and ownership routes**

Run:

```bash
rg -n "assertOwnedPennySession|ownershipRegistryForEvent|getChatHistory|getSessionArtifacts|deletePennySession|fetchChatHistory|deleteGatewaySession" web/src/routes web/src/lib/server
```

Expected: all public chat/history/artifact/session-delete paths show ownership checks before gateway calls.

- [ ] **Step 3: Write app-side regression test**

Create `web/src/lib/server/openclaw-isolation-proof.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

import { getChatHistory } from './chat-orchestration.js';
import type { PennySessionOwnershipStore } from './penny-session-ownership.js';

const SESSION_KEY = 'agent:main:penny:550e8400-e29b-41d4-a716-446655440000';

vi.mock('./gateway-chat-service.js', () => ({
	fetchChatHistory: vi.fn(async () => ({
		messages: [],
		sessionId: 'session-1',
		sessionKey: SESSION_KEY
	}))
}));

describe('OpenClaw isolation proof', () => {
	it('does not call gateway history when ownership rejects the session', async () => {
		const store: PennySessionOwnershipStore = {
			hasSession: async () => false
		};
		const gateway = await import('./gateway-chat-service.js');

		await expect(
			getChatHistory({ ownershipStore: store, sessionKey: SESSION_KEY })
		).rejects.toThrow('session is not available');
		expect(gateway.fetchChatHistory).not.toHaveBeenCalled();
	});
});
```

- [ ] **Step 4: Run isolation test**

Run: `npm --prefix web test -- openclaw-isolation-proof.test.ts`

Expected: PASS.

- [ ] **Step 5: Write source-grounded proof document**

Create `docs/security/openclaw-isolation-proof.md`:

```markdown
# OpenClaw Isolation Proof

Date: 2026-06-25

## Scope

This proof covers Penny's app-side isolation before calling OpenClaw gateway APIs. It does not claim OpenClaw internally enforces tenant isolation unless confirmed from source paths listed below.

## OpenClaw Source Inspected

- `/Users/smitmaxhhi/.opensrc/repos/github.com/openclaw/openclaw/main/packages/sdk/src/client.ts:656`: SDK `SessionsNamespace` sends `sessions.list`, `sessions.create`, `sessions.resolve`, and `sessions.send` requests by session key.
- `/Users/smitmaxhhi/.opensrc/repos/github.com/openclaw/openclaw/main/extensions/admin-http-rpc/src/methods.ts:1`: admin HTTP RPC allowlist excludes session list/delete/chat history methods from that extension.
- `/Users/smitmaxhhi/.opensrc/repos/github.com/openclaw/openclaw/main/extensions/admin-http-rpc/src/handler.ts:161`: admin HTTP RPC dispatch validates method allowlist before `dispatchGatewayMethod`.
- `/Users/smitmaxhhi/.opensrc/repos/github.com/openclaw/openclaw/main/packages/sdk/src/index.e2e.test.ts:225`: SDK e2e fixture shows `sessions.list`, `sessions.create`, and `sessions.send` are gateway RPC method names.

## Penny App Boundary

- Public chat history route requires `ownershipRegistryForEvent` before `getChatHistory`.
- Public artifact routes require `assertOwnedPennySession` before reading workspace artifacts.
- Public session delete route requires `assertOwnedPennySession` before `deletePennySession`.

## Regression Test

`web/src/lib/server/openclaw-isolation-proof.test.ts` proves `getChatHistory` does not call `fetchChatHistory` when the ownership store rejects the session.

## Residual Risk

The app prevents cross-user gateway reads at the SvelteKit route layer. A direct operator call to OpenClaw, a gateway auth bypass, or a future route that calls gateway services without a registry would still bypass this app-side control.
```

- [ ] **Step 6: Update GDPR readiness doc**

Mark `GDPR-002` as partially complete, with residual risk that direct OpenClaw/operator access still needs operational control.

- [ ] **Step 7: Verify**

Run:

```bash
npm --prefix web test -- openclaw-isolation-proof.test.ts
npm --prefix web run check
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add web/src/lib/server/openclaw-isolation-proof.test.ts docs/security/openclaw-isolation-proof.md docs/security/gdpr-readiness.md
git commit -m "claw shows papers"
```

---

### Task 6: Final Verification and Plan Closeout

**Files:**
- Modify: `docs/security/gdpr-readiness.md`

**Interfaces:**
- Consumes: All previous task outputs.
- Produces: Final status update and proof commands.

- [ ] **Step 1: Run full verification**

Run:

```bash
npm --prefix web run check
npm --prefix web test
npm --prefix shared test
npm --prefix plugin test
```

Expected:

- `svelte-check found 0 errors and 0 warnings`
- All web Vitest files pass
- Shared Node tests pass
- Plugin build/tests pass

- [ ] **Step 2: Update GDPR readiness final status**

In `docs/security/gdpr-readiness.md`, add a short "Implemented controls" section:

```markdown
## Implemented controls from 2026-06-25 plan

- User-facing privacy export/delete controls.
- Full artifact markdown/PDF metadata in privacy export.
- Account deletion request policy without service-role exposure in the web app.
- Retention purge service and CLI entrypoint.
- OpenClaw isolation proof note plus app-side regression test.
```

- [ ] **Step 3: Commit documentation finalization**

```bash
git add docs/security/gdpr-readiness.md
git commit -m "privacy closes tabs"
```

- [ ] **Step 4: Report remaining deferred items**

Final implementation summary must explicitly say:

- Implemented now: user-facing privacy UI, full artifact/PDF export metadata, Supabase account deletion request policy, retention purge service, OpenClaw isolation proof.
- Deferred by user request: subprocessors/SCC register, DPIA screening.
- Remaining operational work: production scheduler, operator runbook for account deletion requests, backup deletion guarantees, legal privacy notice review.

---

## Self-Review

- Spec coverage: The plan covers user-facing privacy UI, full artifact/PDF export, Supabase account deletion policy, retention purge, and OpenClaw isolation proof.
- Explicitly deferred: subprocessors/SCC register and DPIA screening.
- No MCP startup required.
- OpenClaw-specific work includes required `opensrc` source inspection before implementation.
- Each task has a focused test cycle and an explicit commit command.
