# Official Source Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix false “blocked” reads on Investissement Québec (and similar) pages, pre-seed known official PDFs in the corpus, and teach Penny a Plan B workflow when Exa discovers a program whose marketing URL cannot be read.

**Architecture:** The reader keeps Crawl4AI → Firecrawl sequential fallback on the **same URL**, but tightens blocked-content detection so footer reCAPTCHA widgets do not reject real program text. When a read is genuinely blocked, the model-visible tool result adds a neutral **recovery hint** (not raw errors). Penny’s always-loaded skill documents a **Plan B Exa search** on official government PDF hosts. Known Quebec IQ programs get a second `source_url` pointing at the MEIE cadre normatif PDF on `cdn-contenu.quebec.ca`.

**Tech Stack:** TypeScript (`node:test`), OpenClaw plugin, `verified-programs.json`, workspace skills (`penny-funding`, `AGENTS.md`), Fly deploy smoke.

---

## File map

| File | Responsibility |
|------|----------------|
| `plugin/src/services/official-source-reader.ts` | Blocked-content heuristics; model redaction + recovery hint |
| `plugin/src/services/official-source-recovery-hints.ts` | Domain → neutral Plan B hint strings (new, small) |
| `plugin/src/official-source-reader.test.ts` | CAPTCHA false-positive + hint regression tests |
| `database/data/funding/curated/verified-programs.json` | Add ESSOR cadre normatif PDF `source_url` |
| `database/scripts/verify_funding_corpus.py` | Assert IQ ESSOR row has ≥2 source URLs (if script supports) |
| `workspace/skills/penny-funding/SKILL.md` | Plan B blocked-page recovery section |
| `workspace/AGENTS.md` | One-paragraph pointer to Plan B rule |
| `scripts/verify_penny_phase1.sh` | Optional IQ URL smoke after reader change |

---

### Task 1: Fix CAPTCHA false-positive in blocked-content detection

**Problem (proven on Fly):** Firecrawl returns ~15k chars of real ESSOR content from `investquebec.com`, but `detectBlockedSourceContent` matches `\bcaptcha\b` in a newsletter footer (“Google reCAPTCHA”) and marks the page blocked.

**Files:**
- Modify: `plugin/src/services/official-source-reader.ts`
- Modify: `plugin/src/official-source-reader.test.ts`

- [ ] **Step 1: Write failing tests**

Add fixtures and tests:

```ts
test('detectBlockedSourceContent ignores footer reCAPTCHA widget on long program pages', () => {
  const body = '# ESSOR\n\n'.repeat(200) + '\n\nCAPTCHA\n\nCharger le contenu externe fourni par Google reCAPTCHA';
  assert.equal(detectBlockedSourceContent(body), false);
});

test('detectBlockedSourceContent still catches real challenge pages', () => {
  assert.equal(
    detectBlockedSourceContent('Verifying your browser before proceeding...\nIncident ID: abc'),
    true
  );
});

test('readOfficialSourceWithFallback accepts Investissement Quebec page with footer captcha chrome', async () => {
  // firecrawl returns long markdown with footer CAPTCHA; must succeed as firecrawl_scrape
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `cd plugin && npm test -- official-source-reader.test.ts`

- [ ] **Step 3: Implement minimal heuristic**

Replace bare `CAPTCHA_PATTERN = /\bcaptcha\b/i` with stricter logic. Preferred approach (pick one, keep ≤50 LOC):

**Option A (recommended):** CAPTCHA only counts as blocked when paired with a challenge signal OR the page is too short to be real content:

```ts
const MIN_SUBSTANTIVE_PAGE_CHARS = 2_000;

function captchaIndicatesBlock(text: string): boolean {
  if (!CAPTCHA_PATTERN.test(text)) return false;
  if (text.length >= MIN_SUBSTANTIVE_PAGE_CHARS) return false;
  return VERIFY_BROWSER_PATTERN.test(text) || RADWARE_PATTERN.test(text) || INCIDENT_ID_PATTERN.test(text);
}
```

**Option B:** Remove `\bcaptcha\b` entirely; rely on Radware / verifying browser / incident id / access denied (footer widget alone never blocks).

Document chosen rule in a one-line comment above the helper.

- [ ] **Step 4: Run tests — expect PASS**

Run: `cd plugin && npm test`

- [ ] **Step 5: Commit**

```bash
git add plugin/src/services/official-source-reader.ts plugin/src/official-source-reader.test.ts
git commit -m "captcha stops crying wolf"
```

---

### Task 2: Add model-visible recovery hint when a read is genuinely blocked

**Problem:** When blocked, Penny only sees `summary: "Could not verify this page."` — no guidance for Plan B on net-new Exa discoveries.

**Files:**
- Create: `plugin/src/services/official-source-recovery-hints.ts`
- Modify: `plugin/src/services/official-source-reader.ts`
- Modify: `plugin/src/official-source-reader.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
test('recoveryHintForBlockedUrl suggests Quebec cadre normatif for investquebec.com', () => {
  const hint = recoveryHintForBlockedUrl('https://www.investquebec.com/fr/financement/...');
  assert.match(hint, /cdn-contenu\.quebec\.ca|cadre normatif/i);
});

test('redactOfficialSourceResultForModel includes recovery_hint when blocked', () => {
  const publicResult = redactOfficialSourceResultForModel({
    success: false,
    url: 'https://www.investquebec.com/fr/financement/...',
    reader: 'blocked',
    verification_source: 'unverified_blocked',
    fetched_at: '2026-06-25T00:00:00.000Z'
  });
  assert.equal(publicResult.success, false);
  assert.match(publicResult.recovery_hint ?? '', /cadre normatif|official.*pdf/i);
  assert.doesNotMatch(JSON.stringify(publicResult), /blocked_by_anti_bot|EPIPE/i);
});
```

- [ ] **Step 2: Run tests — expect FAIL**

- [ ] **Step 3: Implement hint helper**

`official-source-recovery-hints.ts`:

```ts
export function recoveryHintForBlockedUrl(url: string): string | undefined {
  const host = new URL(url).hostname.toLowerCase();
  if (host.endsWith('investquebec.com')) {
    return 'Marketing page unreadable. Search for the official Quebec cadre normatif PDF on cdn-contenu.quebec.ca, then read_official_source on that PDF.';
  }
  if (host.endsWith('revenuquebec.ca')) {
    return 'Page unreadable. Search for the same program on quebec.ca or an official Revenu Québec PDF, then read_official_source on the candidate.';
  }
  return 'Page unreadable. Run a targeted web_search on the official government domain for a policy PDF or mirror page, then read_official_source on the result.';
}
```

Extend `OfficialSourceModelResult`:

```ts
recovery_hint?: string | undefined;
```

Set in `redactOfficialSourceResultForModel` only when `reader === 'blocked'`. Do **not** expose crawl errors, stack traces, or anti-bot strings.

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add plugin/src/services/official-source-recovery-hints.ts plugin/src/services/official-source-reader.ts plugin/src/official-source-reader.test.ts
git commit -m "blocked pages get directions"
```

---

### Task 3: Add ESSOR cadre normatif PDF to corpus

**Problem:** Corpus ESSOR row only lists `investquebec.com`; Penny never sees the working official PDF.

**Files:**
- Modify: `database/data/funding/curated/verified-programs.json`
- Modify: `database/data/funding/curated/curation-notes.md` (one line, optional)

- [ ] **Step 1: Add second source_url**

For program `ESSOR - Investment Project Feasibility and Digital Diagnostics`, append:

```json
"https://cdn-contenu.quebec.ca/cdn-contenu/adm/min/economie/publications-adm/cadres-normatifs-programmes/CN_ESSOR_2025-2027_MAJ-0725_MEIE.pdf"
```

Add evidence line: *Authoritative rules published in MEIE cadre normatif (Gazette officielle); Investissement Québec site is application/marketing layer.*

- [ ] **Step 2: Verify corpus integrity**

Run: `cd database && python3 scripts/verify_funding_corpus.py`

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add database/data/funding/curated/verified-programs.json database/data/funding/curated/curation-notes.md
git commit -m "essor keeps pdf backup"
```

**Note:** Other `investquebec.com` corpus rows (tax-credit attestation pages) do not yet have mapped cadre normatif PDFs — leave for a follow-up curation pass unless a matching official PDF is found during implementation.

---

### Task 4: Teach Penny Plan B in always-loaded skill + AGENTS

**Problem:** For Exa-discovered programs not in corpus, Penny needs an explicit blocked → official-PDF search recipe.

**Files:**
- Modify: `workspace/skills/penny-funding/SKILL.md`
- Modify: `workspace/AGENTS.md`

- [ ] **Step 1: Add “Blocked page recovery (Plan B)” section to penny-funding**

Insert after **§4 Verification ledger**. Content to include:

1. If `read_official_source` returns blocked **and** `recovery_hint` is present, follow it before ruling out.
2. Never use Exa snippets, blogs, or accounting-firm pages as proof.
3. Plan B is always: **targeted `web_search` on official domains → `read_official_source` on PDF/mirror candidates**.
4. Domain recipes (examples Penny should use):

| Blocked host | Plan B Exa query shape |
|--------------|------------------------|
| `investquebec.com` | `site:cdn-contenu.quebec.ca "<program name>" cadre normatif ESSOR` |
| `revenuquebec.ca` | `site:quebec.ca "<program name>" crédit d'impôt` |
| Other `.gc.ca` / provincial | `site:<official-domain> "<program>" filetype:pdf` |

5. One official policy PDF can verify multiple related schedules (already in skill — reinforce).
6. Duplicate URL reads still forbidden; each **new** candidate URL gets one read.
7. If Plan B also fails, rule out honestly — do not invent amounts or steps.

- [ ] **Step 2: Add one paragraph to AGENTS.md mandatory workflow**

After the blocked-page bullet: *When blocked, use recovery_hint and penny-funding Plan B before ruling out; only official URLs verified via read_official_source count.*

- [ ] **Step 3: Commit**

```bash
git add workspace/skills/penny-funding/SKILL.md workspace/AGENTS.md
git commit -m "penny learns plan b"
```

---

### Task 5: End-to-end verification on Fly

- [ ] **Step 1: Run plugin tests locally**

Run: `cd plugin && npm test`

- [ ] **Step 2: Deploy**

Run: `fly deploy -a penny-go`

- [ ] **Step 3: Reader smoke — IQ ESSOR marketing page**

```bash
fly ssh console -a penny-go -C "node --input-type=module -e \"
import { readOfficialSourceAction } from '/app/plugin/dist/actions/penny-tools.js';
const cfg = { firecrawlApiKey: 'env:FIRECRAWL_API_KEY', pythonPath: '/app/.venv/bin/python', repoRoot: '/app' };
const r = await readOfficialSourceAction(cfg, 'https://www.investquebec.com/fr/financement/programmes-gouvernementaux/essor/appui-la-concretisation-de-projets-dinvestissement');
console.log(JSON.stringify({ success: r.success, reader: r.reader, mdLen: (r.markdown||'').length, hint: r.recovery_hint }));
\""
```

Expected after Task 1: `success: true`, `reader: firecrawl_scrape`, `mdLen > 5000`, no `recovery_hint`.

- [ ] **Step 4: Reader smoke — ESSOR PDF still works**

Same command with cadre normatif PDF URL.

Expected: `success: true`, `reader: crawl4ai` or `firecrawl_scrape`.

- [ ] **Step 5: Live agent spot-check (optional, costs API credits)**

New chat on penny.tanex.co with the Laval CNC prompt. Confirm session jsonl shows:

- `read_official_source` on IQ ESSOR URL → success (not blocked)
- Or, if still blocked, a follow-up `web_search` + PDF read before recommend
- `publish_funding_brief` lists ESSOR as verified or honestly ruled out

- [ ] **Step 6: Commit deploy notes if config changed**

---

## Out of scope (follow-ups)

- Mapping cadre normatif PDFs for the other two `investquebec.com` corpus rows (Gaspésie, multimedia tax credit) — needs curation research.
- Automatic reader-side URL chasing (hardcoded IQ → PDF map inside `readOfficialSourceWithFallback`) — rejected; hints + agent Plan B keep Penny agentic.
- Changing `funding-evidence-recovery.ts` server synthesis — separate from agent tool path.

---

## Success criteria

1. IQ ESSOR marketing URL verifies on Fly without CAPTCHA false block.
2. Blocked reads return `recovery_hint` to the model, never raw anti-bot text.
3. ESSOR corpus row includes cadre normatif PDF `source_url`.
4. `penny-funding` skill documents Plan B for Exa-discovered blocked programs.
5. Re-run Laval eval: ESSOR no longer auto-ruled out when PDF path exists.

---

## Task order

```
Task 1 (CAPTCHA fix) → Task 2 (hints) → Task 3 (corpus) → Task 4 (skills) → Task 5 (Fly verify)
```

Tasks 1 and 2 can ship independently; Task 3–4 can parallelize after Task 1.
