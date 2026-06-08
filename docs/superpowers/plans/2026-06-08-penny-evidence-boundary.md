# Penny Evidence Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep Exa as a real fallback for blocked official pages, but make Penny's evidence path and artifact path structurally unable to leak tool failure text into user-facing artifacts.

**Architecture:** The source reader stays the retrieval boundary and returns structured outcomes for crawl, Exa fallback, and blocked pages. A small redaction helper turns that internal result into a model-safe tool payload with a neutral summary, while the artifact validator rejects any markdown that still contains internal failure phrases or raw tooling language. Penny's always-loaded instructions are updated so the model follows the same rule set the code enforces.

**Tech Stack:** TypeScript, JSON5 config, `node:test`, OpenClaw plugin runtime, existing `shared/` validation helpers.

---

### Task 1: Disable native skill auto-loading in Penny's OpenClaw config

**Files:**
- Modify: `config/openclaw.fly.json5`
- Modify: `config/openclaw.penny.example.json5`
- Modify: `scripts/openrouter-config.test.ts`

- [ ] **Step 1: Write the failing test**

Add a config assertion that the Penny OpenClaw configs explicitly turn off native skill auto-loading:

```ts
test('Penny OpenClaw configs disable native skill auto-loading', async () => {
	const flyConfig = await readProjectFile('config/openclaw.fly.json5');
	const exampleConfig = await readProjectFile('config/openclaw.penny.example.json5');

	assert.match(flyConfig, /"nativeSkills"\s*:\s*false/);
	assert.match(exampleConfig, /"nativeSkills"\s*:\s*false/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --experimental-strip-types --test scripts/openrouter-config.test.ts`

Expected: FAIL until both configs include `commands.nativeSkills: false`.

- [ ] **Step 3: Write the minimal config change**

Add the commands block to both configs:

```json5
"commands": {
  "nativeSkills": false
}
```

Keep the rest of the config unchanged. Do not add a new skills list.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --experimental-strip-types --test scripts/openrouter-config.test.ts`

Expected: PASS, and the live config still validates.

- [ ] **Step 5: Commit**

```bash
git add config/openclaw.fly.json5 config/openclaw.penny.example.json5 scripts/openrouter-config.test.ts
git commit -m "skills stay asleep"
```

### Task 2: Redact raw source-reader failure text from the model-visible tool result

**Files:**
- Modify: `plugin/src/services/official-source-reader.ts`
- Modify: `plugin/src/actions/penny-tools.ts`
- Modify: `plugin/src/official-source-reader.test.ts`

- [ ] **Step 1: Write the failing test**

Add a regression that proves the reader still falls back to Exa, and that the redacted payload the model sees does not expose anti-bot error strings:

```ts
test('readOfficialSourceAction returns Exa success without raw blocked text', async () => {
	clearOfficialSourceReadCacheForTests();

	const result = await readOfficialSourceWithFallback({
		url: OFFICIAL_URL,
		exaApiKey: EXA_KEY,
		readWithCrawl4Ai: async () => ({
			success: false,
			url: OFFICIAL_URL,
			error: 'Blocked by anti-bot protection: Structural: no <body> tag (15145 bytes)',
			fetched_at: '2026-06-06T20:44:25.270528+00:00'
		}),
		readWithExaContents: async () => ({
			success: true,
			url: OFFICIAL_URL,
			markdown: '# Employ PEI\n\nEmploy PEI is a wage subsidy for eligible employers.',
			fetched_at: '2026-06-06T20:44:26.000Z'
		})
	});

	assert.equal(result.reader, 'exa_contents');
	assert.equal(result.verification_source, 'exa_official_contents');
	assert.equal(result.success, true);
});
```

Then add a test for a new `redactOfficialSourceResultForModel(...)` helper that the model-visible result contains a neutral summary and does not contain raw blocked phrases:

```ts
const publicResult = redactOfficialSourceResultForModel(result);

assert.equal(publicResult.summary, 'Could not verify this page.');
assert.doesNotMatch(JSON.stringify(publicResult), /blocked_by_anti_bot|anti-bot protection|verifying your browser/i);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd plugin && npm test`

Expected: FAIL because the current model-visible tool result still carries raw failure text.

- [ ] **Step 3: Write the minimal implementation**

Keep the internal `readOfficialSourceWithFallback(...)` behavior and cache logic, but add `redactOfficialSourceResultForModel(...)` in `plugin/src/services/official-source-reader.ts` and have `readOfficialSourceAction(...)` return that redacted shape so the model sees only a structured summary, not the raw `error` string.

Use a result shape like:

```ts
{
	success: boolean;
	url: string;
	reader: 'crawl4ai' | 'exa_contents' | 'blocked';
	verification_source: 'live_official_page' | 'exa_official_contents' | 'unverified_blocked';
	summary: string;
	markdown?: string;
	fetched_at?: string;
	benefit_scope?: OfficialBenefitScope;
}
```

For blocked pages, emit a neutral `summary` such as `Could not verify this page.` Do not return the raw anti-bot text in the model-visible response.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd plugin && npm test`

Expected: PASS, with Exa still used when Crawl4AI fails.

- [ ] **Step 5: Commit**

```bash
git add plugin/src/services/official-source-reader.ts plugin/src/actions/penny-tools.ts plugin/src/official-source-reader.test.ts
git commit -m "source fails less loudly"
```

### Task 3: Reject artifact markdown that leaks internal tool text

**Files:**
- Modify: `shared/artifact-input-validation.ts`
- Modify: `shared/artifact.test.ts`
- Modify: `plugin/src/tools/create-funding-brief-tool.ts`
- Modify: `plugin/src/create-funding-brief-tool.test.ts`

- [ ] **Step 1: Write the failing test**

Add a regression that feeds the artifact validator a body containing the exact leak text and expects rejection, plus one neutral ruled-out example that should still pass:

```ts
test('validateCreateFundingArtifactInput rejects internal tool failure text', () => {
	const input = buildValidInput();
	input.bodyMarkdown = [
		'# NorthBind Funding Plan',
		'',
		'## Ruled out',
		'',
		'- Page blocked by anti-bot protection; could not verify.',
		'',
		'1. Use a different source.'
	].join('\n');

	const result = validateCreateFundingArtifactInput(input);

	assert.equal(result.ok, false);
	if (!result.ok) {
		assert.ok(result.errors.some((error) => error.field === 'bodyMarkdown'));
	}
});

test('validateCreateFundingArtifactInput allows neutral ruled-out language', () => {
	const input = buildValidInput();
	input.bodyMarkdown = [
		'# NorthBind Funding Plan',
		'',
		'## Ruled out',
		'',
		'- Could not verify this page, so it stays out of the recommendation set.',
		'',
		'1. Use a different source.'
	].join('\n');

	const result = validateCreateFundingArtifactInput(input);

	assert.equal(result.ok, true);
});
```

Also add a tool-level test that `createFundingBriefTool(...)` refuses the same leakage if it arrives from the model.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd shared && npm test`

Expected: FAIL until the validator blocks the leakage pattern.

- [ ] **Step 3: Write the minimal implementation**

Add a narrow guard in `shared/artifact-input-validation.ts` for internal phrases that never belong in the PDF, such as:

```ts
blocked_by_anti_bot
anti-bot protection
verifying your browser before proceeding
read tool not found
toolCall
toolResult
/app/workspace/
```

Keep the existing ruled-out logic for loan-like programs, but make the new leakage guard separate so normal `Ruled out` sections still work.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd shared && npm test`

Expected: PASS, and the existing ruled-out loan tests still pass.

- [ ] **Step 5: Commit**

```bash
git add shared/artifact-input-validation.ts shared/artifact.test.ts plugin/src/tools/create-funding-brief-tool.ts plugin/src/create-funding-brief-tool.test.ts
git commit -m "artifacts stop tattling"
```

### Task 4: Update Penny instructions to match the structured fallback contract

**Files:**
- Modify: `workspace/AGENTS.md`
- Modify: `workspace/SOUL.md`
- Modify: `docs/penny-artifacts.md`
- Modify: `docs/penny-local-setup.md`
- Modify: `scripts/openrouter-config.test.ts`

- [ ] **Step 1: Write the failing test**

Add assertions that the always-loaded instructions mention the real fallback behavior but do not contain internal failure phrases:

```ts
test('always-loaded Penny instructions describe neutral fallback behavior', async () => {
	const agentRules = await readProjectFile('workspace/AGENTS.md');
	const voiceRules = await readProjectFile('workspace/SOUL.md');
	const allRules = `${agentRules}\n${voiceRules}`;

	assert.match(allRules, /Exa/i);
	assert.doesNotMatch(allRules, /blocked_by_anti_bot|anti-bot protection|read tool not found/i);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --experimental-strip-types --test scripts/openrouter-config.test.ts`

Expected: FAIL until the instructions explicitly describe neutral fallback handling and stop referencing internal failure text.

- [ ] **Step 3: Write the minimal instruction updates**

Rewrite the workspace instructions so they say:

```markdown
If Crawl4AI is blocked, try Exa's official contents path next.
If neither source verifies the page, mark the program as not verified or ruled out in neutral language.
Never quote tool failure text, raw anti-bot strings, or filesystem paths in the artifact.
```

Update the docs so the same rule is visible in the local setup and artifact guidance pages.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --experimental-strip-types --test scripts/openrouter-config.test.ts`

Expected: PASS, and the updated docs still describe the artifact workflow clearly.

- [ ] **Step 5: Commit**

```bash
git add workspace/AGENTS.md workspace/SOUL.md docs/penny-artifacts.md docs/penny-local-setup.md scripts/openrouter-config.test.ts
git commit -m "words behave now"
```

### Task 5: Verify the live deployment and artifact output

**Files:**
- None if the code already passes, otherwise only the files touched above

- [ ] **Step 1: Run the full targeted verification**

Run:

```bash
sh scripts/fly-start.test.sh
node --experimental-strip-types --test scripts/openrouter-config.test.ts
cd plugin && npm test
cd ../shared && npm test
git diff --check
```

Expected: all commands pass cleanly.

- [ ] **Step 2: Deploy to Fly**

Run: `fly deploy -a penny-go`

Expected: the machine restarts on the new image and health checks pass.

- [ ] **Step 3: Inspect the live artifact and the current session**

Run a live SSH grep against:

```bash
/app/workspace/artifacts
/app/workspace/.openclaw-state/agents/main/sessions
```

Expected: the latest artifact markdown contains only neutral ruled-out wording, and no raw phrases like `blocked_by_anti_bot`, `anti-bot protection`, or `read tool not found`.

- [ ] **Step 4: Commit any final verification-only follow-ups**

If the verification exposed a missing guard, make that guard in the corresponding task file and commit it there. Do not leave a separate “verification fix” commit unless the bug is genuinely separate.
