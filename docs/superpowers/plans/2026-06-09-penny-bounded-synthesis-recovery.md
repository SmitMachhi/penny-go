# Penny Bounded Synthesis Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Penny finish with a useful evidence-backed answer before or during stuck-run recovery, instead of researching until OpenClaw aborts and leaves the user with progress text only.

**Architecture:** Fix the failure at two layers. First, tighten Penny's funding workflow so the agent must synthesize once it has enough verified programs. Second, add a server-side recovery path that can convert verified official-source tool results into a clearly labeled rescue answer when OpenClaw aborts after evidence exists.

**Tech Stack:** SvelteKit server routes, Vitest, Penny workspace skills, OpenClaw transcript/history events, existing gateway chat service.

---

## File Structure

- Modify `workspace/skills/penny-funding/SKILL.md`: strengthen stop rules and synthesis obligation after 2-4 verified fits or 8-10 verified official reads.
- Create `web/src/lib/server/funding-evidence-recovery.ts`: parse normalized chat history/tool result blocks into a minimal verified-evidence ledger and build a rescue answer.
- Create `web/src/lib/server/funding-evidence-recovery.test.ts`: unit-test the Laval/Quebec failure shape, blocked pages, Firecrawl successes, loan/repayable vetoes, and empty-evidence no-op.
- Modify `web/src/lib/server/penny-turn-service.ts`: when a turn is marked aborted/failed, inspect current history and, if no assistant final exists after the user but verified evidence exists, append or return a recovery assistant message through an existing persistence path.
- Modify `web/src/lib/server/gateway-chat-service.ts` and `web/src/lib/server/gateway-rpc.ts`: add the smallest gateway method needed to append a recovery assistant message if the gateway already exposes a message/session append RPC. If no append RPC exists, store the recovery answer in the Penny turn ledger and expose it through bootstrap/history.
- Modify `web/src/lib/server/session-bootstrap.ts` and tests if the fallback is ledger-backed: merge a recovery assistant message after the last user when the gateway transcript ended with an empty aborted assistant message.
- Modify `web/src/lib/chat/client-stream-events.ts`: on `chat.aborted`, trigger history reload or display the server-provided recovery message instead of silently resetting to Online.
- Modify `web/src/lib/chat/client-run-recovery.ts` and `client-run-recovery.test.ts`: treat a server-created recovery assistant after the last user as completed.
- Create `scripts/evals/penny_quebec_laval_live.sh`: repeat the exact frontend eval with a long wait and transcript checks.

## Core Design Rules

- Do not bypass OpenClaw as the primary agent. Deterministic code only rescues a failed turn after OpenClaw has already produced verified evidence.
- Do not recommend from search snippets, database-only rows, or blocked official reads.
- A recovery answer must label itself honestly: "Penny verified these before the run was interrupted."
- A recovery answer must include only official URLs where `read_official_source.success === true` and `reader` is `crawl4ai` or `firecrawl_scrape`.
- A recovery answer must not include programs whose `benefit_scope.scope_verdict === "ruled_out"` as actionable.
- Recovery output is intentionally short: snapshot, verified fits, ruled-out/unknown notes, and next step.

---

### Task 1: Tighten Penny's Stop Rule

**Files:**
- Modify: `workspace/skills/penny-funding/SKILL.md`

- [ ] **Step 1: Add a failing text assertion test**

Create a small Node assertion script in the command itself so no extra test file is needed:

```bash
node - <<'NODE'
const fs = require('fs');
const text = fs.readFileSync('workspace/skills/penny-funding/SKILL.md', 'utf8');
for (const phrase of [
  'Synthesis trigger',
  'Do not start another web_search once',
  'If the next tool call would only improve confidence, answer now'
]) {
  if (!text.includes(phrase)) {
    throw new Error(`missing phrase: ${phrase}`);
  }
}
NODE
```

Expected: FAIL before the change with `missing phrase: Synthesis trigger`.

- [ ] **Step 2: Patch the latency rule**

In `workspace/skills/penny-funding/SKILL.md`, replace the current `Latency rule` paragraph with:

```markdown
Latency rule and synthesis trigger:

- Once you have 2-4 verified strong or conditional fits, stop expanding the
  search and produce the answer or artifact.
- Once you have read 8 official URLs in one turn, stop unless every verified
  candidate is ruled out and one named user mechanism is still completely
  uncovered.
- Do not start another `web_search` once at least two material lanes are
  verified for the user case. Material lanes include capex, training, tax
  credit, wage subsidy, export, R&D, and regional business support.
- If the next tool call would only improve confidence, answer now. Say what is
  verified, what was blocked, and what is conditional.
- If a tool result gives you a strong local fit, such as a municipal or regional
  program that directly matches the user's location and spend mechanism, keep it
  in the answer even if nearby federal programs remain unresolved.
```

- [ ] **Step 3: Verify the text assertion passes**

Run:

```bash
node - <<'NODE'
const fs = require('fs');
const text = fs.readFileSync('workspace/skills/penny-funding/SKILL.md', 'utf8');
for (const phrase of [
  'Synthesis trigger',
  'Do not start another `web_search` once',
  'If the next tool call would only improve confidence, answer now'
]) {
  if (!text.includes(phrase)) {
    throw new Error(`missing phrase: ${phrase}`);
  }
}
NODE
```

Expected: PASS with no output.

- [ ] **Step 4: Commit**

```bash
git add workspace/skills/penny-funding/SKILL.md
git commit -m "patience ate dinner"
```

---

### Task 2: Build Verified Evidence Extraction

**Files:**
- Create: `web/src/lib/server/funding-evidence-recovery.ts`
- Create: `web/src/lib/server/funding-evidence-recovery.test.ts`

- [ ] **Step 1: Write failing tests**

Create `web/src/lib/server/funding-evidence-recovery.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import {
	buildFundingRecoveryAnswer,
	extractVerifiedFundingEvidence
} from './funding-evidence-recovery.js';

const user = { id: 'u1', role: 'user' as const, text: 'We run a 42-person precision parts manufacturer near Laval, Quebec.' };

function toolResult(text: string) {
	return {
		id: crypto.randomUUID(),
		role: 'tool' as const,
		text
	};
}

describe('funding evidence recovery', () => {
	it('extracts successful official reads and ignores blocked pages', () => {
		const evidence = extractVerifiedFundingEvidence([
			user,
			toolResult(JSON.stringify({
				success: false,
				url: 'https://www.revenuquebec.ca/blocked',
				reader: 'blocked',
				verification_source: 'unverified_blocked',
				summary: 'Could not verify this page.'
			})),
			toolResult(JSON.stringify({
				success: true,
				url: 'https://lavaleconomique.com/programme/virage-techno-manufacturier/',
				reader: 'firecrawl_scrape',
				verification_source: 'firecrawl_official_scrape',
				summary: 'Retrieved official page content via Firecrawl.',
				markdown: '# Virage techno manufacturier\nSubvention allant jusqu a 50 000 $ pour automatisation et robotisation.'
			}))
		]);

		expect(evidence.verified).toHaveLength(1);
		expect(evidence.blocked).toHaveLength(1);
		expect(evidence.verified[0]).toMatchObject({
			reader: 'firecrawl_scrape',
			url: 'https://lavaleconomique.com/programme/virage-techno-manufacturier/'
		});
	});

	it('does not treat ruled-out benefit scope as actionable', () => {
		const evidence = extractVerifiedFundingEvidence([
			user,
			toolResult(JSON.stringify({
				success: true,
				url: 'https://www.canada.ca/en/repayable-program',
				reader: 'firecrawl_scrape',
				verification_source: 'firecrawl_official_scrape',
				markdown: '# Regional Tariff Response Initiative\nRepayable contribution may apply.',
				benefit_scope: {
					scope_verdict: 'ruled_out',
					scope_reason: 'repayable_contribution_detected'
				}
			}))
		]);

		expect(evidence.verified).toHaveLength(0);
		expect(evidence.ruledOut).toHaveLength(1);
	});

	it('builds an honest rescue answer from verified evidence', () => {
		const answer = buildFundingRecoveryAnswer({
			userText: user.text,
			evidence: {
				verified: [
					{
						title: 'Virage techno manufacturier',
						url: 'https://lavaleconomique.com/programme/virage-techno-manufacturier/',
						reader: 'firecrawl_scrape',
						summary: 'Subvention allant jusqu a 50 000 $ pour automatisation et robotisation.'
					}
				],
				blocked: ['https://www.revenuquebec.ca/blocked'],
				ruledOut: []
			}
		});

		expect(answer).toContain('Penny verified these before the run was interrupted');
		expect(answer).toContain('Virage techno manufacturier');
		expect(answer).toContain('firecrawl_scrape');
		expect(answer).toContain('Blocked or not verified');
	});
});
```

Expected: FAIL because the module does not exist.

- [ ] **Step 2: Implement extraction and answer builder**

Create `web/src/lib/server/funding-evidence-recovery.ts`:

```ts
import type { ChatMessage } from '$lib/chat/messages.js';

type OfficialReader = 'crawl4ai' | 'firecrawl_scrape';

type ToolJson = {
	success?: unknown;
	url?: unknown;
	reader?: unknown;
	verification_source?: unknown;
	summary?: unknown;
	markdown?: unknown;
	benefit_scope?: {
		scope_verdict?: unknown;
		scope_reason?: unknown;
	};
};

export type VerifiedFundingEvidence = {
	reader: OfficialReader;
	summary: string;
	title: string;
	url: string;
};

export type FundingEvidenceRecovery = {
	blocked: string[];
	ruledOut: string[];
	verified: VerifiedFundingEvidence[];
};

const MAX_RECOVERY_ITEMS = 4;
const SUMMARY_MAX_CHARS = 220;
const TITLE_MAX_CHARS = 80;

function parseToolJson(text: string): ToolJson | null {
	try {
		const parsed = JSON.parse(text) as unknown;
		return parsed && typeof parsed === 'object' ? parsed as ToolJson : null;
	} catch {
		return null;
	}
}

function readString(value: unknown): string | null {
	return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function isOfficialReader(value: unknown): value is OfficialReader {
	return value === 'crawl4ai' || value === 'firecrawl_scrape';
}

function firstMarkdownHeading(markdown: string): string | null {
	const heading = markdown
		.split('\n')
		.map((line) => line.trim())
		.find((line) => line.startsWith('# '));
	return heading ? heading.replace(/^#\s+/, '').slice(0, TITLE_MAX_CHARS) : null;
}

function compactSummary(payload: ToolJson): string {
	const summary = readString(payload.summary);
	if (summary && summary !== 'Retrieved official page content via Firecrawl.') {
		return summary.slice(0, SUMMARY_MAX_CHARS);
	}
	const markdown = readString(payload.markdown);
	if (!markdown) {
		return 'Official page content was retrieved successfully.';
	}
	return markdown
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, SUMMARY_MAX_CHARS);
}

function evidenceTitle(payload: ToolJson, url: string): string {
	const markdown = readString(payload.markdown);
	if (markdown) {
		const heading = firstMarkdownHeading(markdown);
		if (heading) {
			return heading;
		}
	}
	return new URL(url).hostname.replace(/^www\./, '').slice(0, TITLE_MAX_CHARS);
}

export function extractVerifiedFundingEvidence(messages: readonly ChatMessage[]): FundingEvidenceRecovery {
	const blocked = new Set<string>();
	const ruledOut = new Set<string>();
	const verified = new Map<string, VerifiedFundingEvidence>();

	for (const message of messages) {
		const payload = parseToolJson(message.text);
		if (!payload) {
			continue;
		}
		const url = readString(payload.url);
		if (!url) {
			continue;
		}
		if (payload.reader === 'blocked' || payload.success === false) {
			blocked.add(url);
			continue;
		}
		if (payload.benefit_scope?.scope_verdict === 'ruled_out') {
			ruledOut.add(url);
			continue;
		}
		if (payload.success !== true || !isOfficialReader(payload.reader)) {
			continue;
		}
		verified.set(url, {
			reader: payload.reader,
			summary: compactSummary(payload),
			title: evidenceTitle(payload, url),
			url
		});
	}

	return {
		blocked: [...blocked],
		ruledOut: [...ruledOut],
		verified: [...verified.values()]
	};
}

export function buildFundingRecoveryAnswer(input: {
	evidence: FundingEvidenceRecovery;
	userText: string;
}): string | null {
	const verified = input.evidence.verified.slice(0, MAX_RECOVERY_ITEMS);
	if (verified.length === 0) {
		return null;
	}
	const lines = [
		'Penny verified these before the run was interrupted. This is a recovery answer from official-page evidence already retrieved in the turn.',
		'',
		'## Snapshot',
		input.userText.trim(),
		'',
		'## Verified fits'
	];

	for (const item of verified) {
		lines.push(`- ${item.title}: ${item.summary} Source: ${item.url} (${item.reader}).`);
	}

	if (input.evidence.blocked.length > 0) {
		lines.push('', '## Blocked or not verified');
		for (const url of input.evidence.blocked.slice(0, MAX_RECOVERY_ITEMS)) {
			lines.push(`- ${url}`);
		}
	}

	if (input.evidence.ruledOut.length > 0) {
		lines.push('', '## Ruled out by scope');
		for (const url of input.evidence.ruledOut.slice(0, MAX_RECOVERY_ITEMS)) {
			lines.push(`- ${url}`);
		}
	}

	lines.push('', '## Next step', 'Use these verified leads first, then rerun only the unresolved tax-credit checks if needed.');
	return lines.join('\n');
}
```

- [ ] **Step 3: Run focused tests**

Run:

```bash
npm --prefix web test -- src/lib/server/funding-evidence-recovery.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add web/src/lib/server/funding-evidence-recovery.ts web/src/lib/server/funding-evidence-recovery.test.ts
git commit -m "proof learned brevity"
```

---

### Task 3: Persist Recovery Answer After Aborted Runs

**Files:**
- Modify: `web/src/lib/server/penny-turn-store.ts`
- Modify: `web/src/lib/server/penny-turn-service.ts`
- Modify: `web/src/lib/server/penny-turn-service.test.ts`
- Modify: `web/src/lib/server/session-bootstrap.ts`
- Modify: `web/src/lib/server/session-bootstrap.test.ts`

- [ ] **Step 1: Add recovery fields to the turn ledger**

In `web/src/lib/server/penny-turn-store.ts`, extend `PennyTurn`:

```ts
recoveryAnswer?: string;
```

Extend `PennyTurnPatch`:

```ts
type PennyTurnPatch = Partial<Pick<PennyTurn, 'status' | 'runId' | 'updatedAt' | 'error' | 'recoveryAnswer'>>;
```

Update `isPennyTurn`:

```ts
(record.recoveryAnswer === undefined || typeof record.recoveryAnswer === 'string')
```

- [ ] **Step 2: Add failing service test**

Append to `web/src/lib/server/penny-turn-service.test.ts`:

```ts
it('stores a recovery answer when an aborted turn has verified evidence but no final reply', async () => {
	await submitPennyTurn({
		message: MESSAGE,
		now: CREATED_AT,
		sessionKey: SESSION_KEY,
		turnId: TURN_ID
	});

	const turn = await reconcileAbortedPennyTurn({
		messages: [
			{ id: 'u1', role: 'user', text: MESSAGE },
			{
				id: 't1',
				role: 'tool',
				text: JSON.stringify({
					success: true,
					url: 'https://lavaleconomique.com/programme/virage-techno-manufacturier/',
					reader: 'firecrawl_scrape',
					verification_source: 'firecrawl_official_scrape',
					markdown: '# Virage techno manufacturier\nSubvention allant jusqu a 50 000 $.'
				})
			}
		],
		runId: RUN_ID,
		sessionKey: SESSION_KEY,
		updatedAt: CREATED_AT
	});

	expect(turn?.status).toBe('aborted');
	expect(turn?.recoveryAnswer).toContain('Penny verified these before the run was interrupted');
});
```

Also import `reconcileAbortedPennyTurn`.

Expected: FAIL because `reconcileAbortedPennyTurn` does not exist.

- [ ] **Step 3: Implement aborted reconciliation**

In `web/src/lib/server/penny-turn-service.ts`, import:

```ts
import {
	buildFundingRecoveryAnswer,
	extractVerifiedFundingEvidence
} from '$lib/server/funding-evidence-recovery.js';
```

Add:

```ts
type ReconcileAbortedPennyTurnInput = {
	messages: ChatMessage[];
	runId: string;
	sessionKey: string;
	updatedAt?: number;
};

function lastUserMessageText(messages: readonly ChatMessage[]): string | null {
	for (let index = messages.length - 1; index >= 0; index -= 1) {
		const message = messages[index];
		if (message?.role === 'user' && message.text.trim()) {
			return message.text.trim();
		}
	}
	return null;
}

export async function reconcileAbortedPennyTurn(
	input: ReconcileAbortedPennyTurnInput
): Promise<PennyTurn | null> {
	const sessionKey = resolveSessionKey(input.sessionKey);
	const turns = await readPennyTurns(sessionKey);
	const turn = turns.find((entry) => entry.runId === input.runId || entry.turnId === input.runId);
	if (!turn) {
		return null;
	}
	const userText = lastUserMessageText(input.messages) ?? turn.message;
	const recoveryAnswer = buildFundingRecoveryAnswer({
		userText,
		evidence: extractVerifiedFundingEvidence(input.messages)
	});
	return patchPennyTurn(sessionKey, turn.turnId, {
		status: 'aborted',
		updatedAt: input.updatedAt ?? Date.now(),
		...(recoveryAnswer ? { recoveryAnswer } : {})
	});
}
```

- [ ] **Step 4: Wire abort events through service**

Where gateway events are handled for `chat.aborted` or `chat.error`, call `fetchChatHistory`, normalize messages, and then call `reconcileAbortedPennyTurn`. If the current code only maps events in `chat-event-mapper.ts`, perform the call in the event bus integration point that already calls `recordPennyTurnRunEvent`.

If no such integration point exists, add a tiny handler in the server event setup:

```ts
if (sse.type === 'chat.aborted') {
	const history = await fetchChatHistory({ sessionKey, limit: CHAT_HISTORY_LIMIT, maxChars: CHAT_HISTORY_MAX_CHARS });
	await reconcileAbortedPennyTurn({
		messages: normalizeHistoryMessages(history.messages),
		runId: sse.runId,
		sessionKey
	});
}
```

- [ ] **Step 5: Expose recovery answer in bootstrap/history**

In `web/src/lib/server/session-bootstrap.ts`, after normal history normalization and active-turn reconciliation, append the latest aborted turn's `recoveryAnswer` after the last user if no completed assistant exists.

Use this helper shape:

```ts
function appendRecoveryAnswerIfNeeded(
	messages: ChatMessage[],
	recoveryAnswer: string | undefined
): ChatMessage[] {
	if (!recoveryAnswer?.trim()) {
		return messages;
	}
	if (findCompletedAssistantAfterLastUser(messages)) {
		return messages;
	}
	return [
		...messages,
		{
			id: crypto.randomUUID(),
			role: 'assistant',
			text: recoveryAnswer
		}
	];
}
```

If importing the client helper would cross server/client boundaries, duplicate the tiny last-user scan in a server helper.

- [ ] **Step 6: Add bootstrap test**

In `web/src/lib/server/session-bootstrap.test.ts`, add a test that sets a turn with `status: "aborted"` and `recoveryAnswer`, mocks history as only `[user, empty aborted assistant]`, and expects bootstrap `messages` to include the recovery assistant.

Expected assertion:

```ts
expect(payload.messages.at(-1)).toMatchObject({
	role: 'assistant',
	text: expect.stringContaining('Penny verified these before the run was interrupted')
});
```

- [ ] **Step 7: Run focused tests**

Run:

```bash
npm --prefix web test -- src/lib/server/penny-turn-service.test.ts src/lib/server/session-bootstrap.test.ts src/lib/server/funding-evidence-recovery.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add web/src/lib/server/penny-turn-store.ts web/src/lib/server/penny-turn-service.ts web/src/lib/server/penny-turn-service.test.ts web/src/lib/server/session-bootstrap.ts web/src/lib/server/session-bootstrap.test.ts
git commit -m "abort wrote apology"
```

---

### Task 4: Frontend Recovery Reload on Abort

**Files:**
- Modify: `web/src/lib/chat/client-stream-events.ts`
- Modify: `web/src/lib/chat/client.svelte.ts`
- Modify: `web/src/lib/chat/client-run-recovery.test.ts`

- [ ] **Step 1: Add a stream handler capability**

In `web/src/lib/chat/client-stream-events.ts`, extend `StreamEventHandlers`:

```ts
recoverAfterAbort: () => void;
```

Change the `chat.aborted` case:

```ts
case 'chat.aborted':
	handlers.resetRun();
	handlers.recoverAfterAbort();
	break;
```

- [ ] **Step 2: Pass the handler from `ChatClient`**

In `web/src/lib/chat/client.svelte.ts`, update `applyStreamEvent` handler object:

```ts
recoverAfterAbort: () => {
	void this.loadHistory();
}
```

- [ ] **Step 3: Add unit coverage**

In `web/src/lib/chat/client-run-recovery.test.ts`, add:

```ts
it('treats a recovery answer after the latest user as completed', () => {
	const messages: ChatMessage[] = [
		{ id: '1', role: 'user', text: 'Quebec manufacturer prompt' },
		{
			id: '2',
			role: 'assistant',
			text: 'Penny verified these before the run was interrupted.'
		}
	];

	expect(findCompletedAssistantAfterLastUser(messages)?.text).toContain('verified');
});
```

- [ ] **Step 4: Run focused tests**

Run:

```bash
npm --prefix web test -- src/lib/chat/client-run-recovery.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/chat/client-stream-events.ts web/src/lib/chat/client.svelte.ts web/src/lib/chat/client-run-recovery.test.ts
git commit -m "frontend checked receipts"
```

---

### Task 5: Add Live Eval Script for the Laval Prompt

**Files:**
- Create: `scripts/evals/penny_quebec_laval_live.sh`

- [ ] **Step 1: Create eval script**

Create `scripts/evals/penny_quebec_laval_live.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

SESSION_NAME="penny-quebec-laval-eval"
URL="${PENNY_EVAL_URL:-https://penny.tanex.co}"
PROMPT='We run a 42-person precision parts manufacturer near Laval, Quebec. We want to buy robotics equipment and train operators. Find realistic grants or tax credits, and be honest if some are loans only.'
MAX_WAIT_SECONDS="${PENNY_EVAL_MAX_WAIT_SECONDS:-1500}"
POLL_SECONDS="${PENNY_EVAL_POLL_SECONDS:-30}"

command -v agent-browser >/dev/null

agent-browser --engine chrome --session "${SESSION_NAME}" open "${URL}"
agent-browser --session "${SESSION_NAME}" wait --load networkidle || true

SNAPSHOT="$(agent-browser --session "${SESSION_NAME}" snapshot -i)"
NEW_CHAT_REF="$(printf '%s\n' "${SNAPSHOT}" | awk '/button "New chat"/ { print $NF; exit }')"
if [[ -n "${NEW_CHAT_REF}" ]]; then
  agent-browser --session "${SESSION_NAME}" click "${NEW_CHAT_REF}"
fi

agent-browser --session "${SESSION_NAME}" type "${PROMPT}"
SNAPSHOT="$(agent-browser --session "${SESSION_NAME}" snapshot -i)"
SEND_REF="$(printf '%s\n' "${SNAPSHOT}" | awk '/button "Send"/ { print $NF; exit }')"
agent-browser --session "${SESSION_NAME}" click "${SEND_REF}"

START="$(date +%s)"
while true; do
  TEXT="$(agent-browser --session "${SESSION_NAME}" get text body || true)"
  if printf '%s\n' "${TEXT}" | rg -q 'Penny verified these before the run was interrupted|Strong fits|Verified fits|Next steps'; then
    printf '%s\n' "${TEXT}"
    agent-browser --session "${SESSION_NAME}" close
    exit 0
  fi
  NOW="$(date +%s)"
  if (( NOW - START > MAX_WAIT_SECONDS )); then
    printf '%s\n' "${TEXT}"
    agent-browser --session "${SESSION_NAME}" close
    echo "eval timed out after ${MAX_WAIT_SECONDS}s" >&2
    exit 1
  fi
  sleep "${POLL_SECONDS}"
done
```

- [ ] **Step 2: Make it executable**

Run:

```bash
chmod +x scripts/evals/penny_quebec_laval_live.sh
```

- [ ] **Step 3: Commit**

```bash
git add scripts/evals/penny_quebec_laval_live.sh
git commit -m "eval waited politely"
```

---

### Task 6: Full Verification and Deploy

**Files:**
- No new source files unless tests expose required fixes.

- [ ] **Step 1: Run web tests**

Run:

```bash
npm --prefix web test
```

Expected: PASS.

- [ ] **Step 2: Run type checks**

Run:

```bash
npm --prefix web run check
```

Expected: PASS.

- [ ] **Step 3: Run focused live eval locally if dev server is configured**

If testing against production after deploy, skip this step and document why. Otherwise run:

```bash
PENNY_EVAL_URL=http://localhost:5173 scripts/evals/penny_quebec_laval_live.sh
```

Expected: final or recovery answer appears before timeout.

- [ ] **Step 4: Commit any test fixes**

```bash
git add <explicit-file-list>
git commit -m "tests found humility"
```

- [ ] **Step 5: Push and deploy**

Run the existing deploy path used for Penny on Fly:

```bash
git push origin master
fly deploy -a penny-go
```

Expected: deploy completes and prints the new image/release id.

- [ ] **Step 6: Run live eval against `penny.tanex.co`**

Run:

```bash
PENNY_EVAL_URL=https://penny.tanex.co PENNY_EVAL_MAX_WAIT_SECONDS=1500 scripts/evals/penny_quebec_laval_live.sh
```

Expected: PASS. The output must contain either a normal final answer with verified fits or the explicit recovery answer. It must not end as Online with progress text only.

- [ ] **Step 7: Commit eval adjustments if needed**

```bash
git add scripts/evals/penny_quebec_laval_live.sh
git commit -m "browser learned patience"
```

---

## Self-Review

Spec coverage:

- Firecrawl backup: covered by extraction allowing `reader: "firecrawl_scrape"` and by live eval expectations.
- Avoid infinite research: covered by Task 1 stop rules.
- Never fail silently: covered by Tasks 2-4 recovery answer path.
- User-facing frontend behavior: covered by Task 4.
- Laval/Quebec regression: covered by Task 5 and Task 6 live eval.

Risk:

- If OpenClaw exposes no append-message RPC, ledger-backed recovery must be merged in `session-bootstrap.ts` and history API responses. That is acceptable because the recovery answer is app-level state for the Penny webapp, not an OpenClaw hallucinated final.
- Recovery answers are less rich than normal Penny answers. That is intentional; they should preserve verified value when the agent run dies, not pretend the run completed normally.
