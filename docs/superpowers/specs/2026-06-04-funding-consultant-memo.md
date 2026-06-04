# Funding Consultant Memo: WYSIWYG PDF, Versions, Print Design

**Status:** Approved (implementation in progress)  
**Date:** 2026-06-04  
**Supersedes:** `2026-06-03-funding-artifact-panel-memory-action-doc.md` (withdrawn — panel ≠ separate work surface)  
**Builds on:** `2026-06-02-funding-artifact-markdown-pdf.md`, `2026-06-03-consultation-modes.md`, `2026-06-02-funding-strategy-document.md` (authoring philosophy)  
**Amends:** Web panel, on-disk layout, API, print CSS, `penny-artifacts` skill

---

## Summary

Penny delivers a **consultant-grade funding memo** the business owner can **preview exactly as downloaded**, **print**, **email**, and **revise over time** as the conversation evolves.

| Principle | Meaning |
|-----------|---------|
| **One deliverable** | The PDF memo is the product; chat is how it gets written |
| **WYSIWYG** | Panel preview and download are the **same `brief.pdf` bytes** for the selected version |
| **One source** | `document.md` is the only canonical body; no duplicate JSON document |
| **Real versions** | Each update appends an **immutable snapshot**; owners can open and download v1, v2, … |
| **Beauty in print** | Professional print design system (CSS + optional structure hooks), not a second web layout |

---

## Product definition

### Job to be done

> *“Give me what a human grant consultant would hand me after our call — so I know what to do, what to pursue, and what I can forward to my team or advisor.”*

### Success (owner-facing)

| Moment | Success |
|--------|---------|
| Opens panel | Sees the **same memo** they will download (current version) |
| Scrolls | Reads like a firm deliverable: clear sections, ranked programs, obvious next steps |
| Downloads | File matches preview; filename is sensible; prints cleanly on Letter |
| Penny updates | New version appears; can still open **previous** version if needed |
| Shares | CFO/advisor gets a complete, trustworthy document without re-explaining chat |

### Non-goals (v1)

- Interactive checkboxes / task sync in the panel  
- In-panel or in-PDF editing by the user  
- Side-by-side markdown + PDF views  
- A separate “work panel” layout that diverges from the download  
- `brief.json` content model, `{{program:N}}` placeholders, HTML slide decks  

---

## First principles: four layers

```text
┌──────────────────────────────────────────────────────────────┐
│ 1. INTELLIGENCE — Penny (agent + skills + tools)             │
│    Judgment, evidence, narrative, when to revise the memo    │
└────────────────────────────┬─────────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. SOURCE — document.md (per version)                      │
│    Single canonical markdown; GFM; consultant structure      │
└────────────────────────────┬─────────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. PRESENTATION — print design system                        │
│    composePdfMarkdown → HTML + artifact-print.css → PDF      │
└────────────────────────────┬─────────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────────┐
│ 4. DELIVERY — preview + download + version history           │
│    PDF.js (or native embed) on brief.pdf; immutable versions/  │
└──────────────────────────────────────────────────────────────┘
```

**Design rule:** Layers 2–4 are deterministic. Layer 1 is agentic. Never fix bad judgment with layout hacks alone — but **do** make good judgment look credible.

---

## Architecture

### End-to-end flow

```text
create_funding_brief (tool)
  → validate bodyMarkdown + verification (+ optional evidence)
  → resolve artifactId (new or update)
  → version = latest + 1 (or 1 if new)
  → write versions/{version}/document.md
  → write versions/{version}/meta.snapshot.json
  → compose PDF input (document + verification appendix in memory)
  → render HTML + print CSS → versions/{version}/brief.pdf
  → update artifact meta.json (latest pointer + index fields)
  → update session index.json
  → SSE artifact.create | artifact.update
  → web panel: preview brief.pdf for selected version
```

### Separation of concerns

| What | Where | User reads? |
|------|-------|-------------|
| Memo body | `versions/{n}/document.md` | Via PDF (and optional future markdown export) |
| Verification appendix | Composed at PDF time from snapshot meta | Last pages of PDF only |
| Evidence audit | `meta.snapshot.json` / root `meta.json` | No (metadata + audit) |
| Print styling | `shared/artifact-print-html.ts` + `artifact-print.css` | Via PDF appearance |
| Panel chrome | Svelte components | Labels, version picker, download — not document body |

Penny writes program narrative **in markdown**. `evidence.programs[]` is audit-only (unchanged).

---

## On-disk layout

Per artifact: `workspace/artifacts/<sessionUuid>/<artifactId>/`

### v5 layout (format version 5)

| Path | Purpose |
|------|---------|
| **`meta.json`** | Current artifact pointer: `latestVersion`, shared fields, `formatVersion: 5` |
| **`versions/{n}/document.md`** | Canonical markdown for version `n` |
| **`versions/{n}/brief.pdf`** | Generated memo for version `n` |
| **`versions/{n}/meta.snapshot.json`** | Immutable metadata for version `n` |

**Removed from active paths (latest-only overwrite):**

| Legacy path | Migration |
|-------------|-----------|
| Root `document.md` | Copy to `versions/{latest}/document.md` if present |
| Root `brief.pdf` | Copy to `versions/{latest}/brief.pdf` if present |

### `meta.json` (artifact root, format v5)

```ts
type ArtifactMetaRecord = {
  artifactId: string;
  sessionUuid: string;
  title: string;                    // latest title (may change per version in snapshot)
  latestVersion: number;          // replaces monolithic version as “current”
  formatVersion: 5;
  triggerReason: 'auto' | 'user_requested';  // latest create/update reason
  createdAt: string;              // artifact first created
  updatedAt: string;              // latest version written
  programCount: number;           // from latest snapshot
  pdfAvailable: boolean;          // latest version PDF ok
  verification: ArtifactVerification;  // latest snapshot (for index/UI)
  evidence?: ArtifactEvidence;
};
```

### `versions/{n}/meta.snapshot.json`

```ts
type ArtifactVersionSnapshot = {
  version: number;
  title: string;
  triggerReason: 'auto' | 'user_requested';
  createdAt: string;                // ISO — when this version was written
  programCount: number;
  pdfAvailable: boolean;
  verification: ArtifactVerification;
  evidence?: ArtifactEvidence;
  changeSummary?: string;         // optional — Penny-authored one-liner for v2+
};
```

**`changeSummary`:** Optional tool field on update (`artifactId` set, `version > 1`). Penny writes one sentence (“Added SR&ED; revised recommendation after expansion timeline”). Rendered in PDF cover block when present.

### Session index entry

```ts
type ArtifactIndexEntry = {
  artifactId: string;
  sessionUuid: string;
  title: string;
  programCount: number;
  latestVersion: number;          // was version
  triggerReason: ArtifactTriggerReason;
  createdAt: string;
  updatedAt: string;
  pdfAvailable: boolean;
};
```

### Path constants (`shared/penny-paths.ts`)

Add:

- `VERSIONS_DIR = 'versions'`
- `versionDir(n) => versions/${n}`
- `VERSION_META_FILENAME = 'meta.snapshot.json'`

Keep `DOCUMENT_MD_FILENAME`, `PDF_FILENAME` **relative to version directory**.

---

## Version control

### Semantics

| Term | Meaning |
|------|---------|
| **Artifact** | Stable `artifactId` for one memo thread in a session |
| **Version** | Immutable snapshot `n = 1, 2, 3…` |
| **Latest** | `meta.latestVersion` — default preview and download |
| **Update** | New version folder; never overwrite prior `document.md` / `brief.pdf` |

### Tool behavior

- **Create:** new `artifactId`, `version = 1`.  
- **Update:** pass `artifactId`; `version = latestVersion + 1`.  
- **Title** may change per version (stored in snapshot).  
- **Failure:** If PDF render fails for version `n`, keep `document.md` + snapshot with `pdfAvailable: false`; do not advance `latestVersion` unless implementation chooses to record failed version — **recommended:** write version folder, set `latestVersion = n`, `pdfAvailable: false` so user sees error state and can retry regenerate (v1.1).

### Retention (v1)

- Keep **all versions** for the life of the artifact (disk is cheap; trust is expensive).  
- **Out of scope v1:** prune policy, max versions, cross-session archive.

### UI version picker

| Control | Behavior |
|---------|----------|
| Default | Shows `latestVersion` |
| Selector | `v3 · Jun 4, 2:14 PM` (localized `updatedAt` from snapshot) |
| Preview | Reload PDF for selected version |
| Download | `?version=3` downloads that snapshot’s `brief.pdf` |
| Label | “Version history” — not merely a build number |

When Penny publishes v2+, toolbar shows: **Updated to v2** (toast or subline, 5s).

---

## WYSIWYG preview

### Contract

| Rule | Implementation |
|------|----------------|
| Preview file | `versions/{selected}/brief.pdf` |
| Download file | Same path, same bytes |
| Query | `GET .../artifacts/{id}?preview=pdf&version={n}` |
| Download | `GET .../artifacts/{id}/download?format=pdf&version={n}` |
| Cache | `cache-control: no-store` on PDF responses |
| No alternate body | Panel does **not** render markdown HTML as the primary view |

### Preview UX

| Element | Spec |
|---------|------|
| Panel title | `meta.title` only — drop generic “ARTIFACT” + fixed “Funding plan” duplicate |
| Subline | `{programCount} programs · v{selectedVersion} · verified {date}` |
| Primary CTA | **Download PDF** — subline: “Same file as this preview” |
| Width | `min(720px, 52vw)` desktop; full-screen overlay mobile (unchanged pattern) |
| Viewer | PDF.js page stack (existing `DocumentPreview.svelte`), lazy page images |
| Full screen | Optional v1.1: expand preview to modal for reading |
| Regenerating | While SSE `artifact.update` in flight: overlay “Updating to v{N}…” on preview; swap when new PDF ready |
| PDF missing | Message + retry hint; do not show stale prior version without label |

### Copy (user-facing)

- Panel header: **Funding memo** (or session-specific title)  
- Toolbar hint: **Preview matches your download**  
- Download: **Download PDF**  

---

## Memo content model (Penny authoring)

### Philosophy

Write like a **funding consultant who just finished a call** with this owner:

- One linear document optimized for **print and forward**, not chat density.  
- **Lead with what matters** from the conversation.  
- **No fixed template** — skip sections that do not serve this user.  
- **Evidence-backed** — programs verified via `read_official_source` before inclusion.  
- **≤5 ranked programs** (`SOUL.md` / existing policy).  
- Verification URL wall **not** in `document.md` — system appendix only.

Follow **`penny-consultation-modes`** for mode-specific section names (`Context` vs `Aspiration`, `Strategy` vs `Launch strategy`).

### Recommended spine (print order)

Penny should **default** to this order when content exists:

| # | Section (H2) | Purpose |
|---|--------------|---------|
| 1 | `# {Title}` | Memo title (matches artifact title) |
| 2 | Cover metadata block | Business name, location, date — plain markdown lines under title |
| 3 | `## Recommendation` | 1–3 sentences; verdict up front |
| 4 | `## Context` or `## Aspiration` | Situation (mode-specific) |
| 5 | `## Plan alignment` / `## Recommended business shape` | When mode requires |
| 6 | `## Programs to pursue` | Ranked program modules |
| 7 | `## Strategy` or `## Launch strategy` | Checklists + numbered plan |
| 8 | *(system)* `## Verification` | PDF appendix only |

### Per-program module (H3)

Each program under `## Programs to pursue`:

```markdown
### 1. Clean Hydrogen Investment Tax Credit (CHITC)

**Verdict:** Pursue now  
**Next step:** Confirm eligible capex line items with your tax advisor this week.

**Why it fits:** …

**Watch out for:** …

| Field | Detail |
| --- | --- |
| Benefit type | Refundable ITC |
| Typical value | … |
| Intake | Open |
| Official page | [Program site](https://…) |

1. First execution step …
2. …
```

**Authoring rules:**

| Element | Rule |
|---------|------|
| **Next step** | Required line `**Next step:**` — one concrete action |
| **Verdict** | Optional `**Verdict:**` — `Pursue now`, `Explore`, `Defer`, `Skip` |
| **Rank** | `### {N}.` establishes order |
| **Tables** | Use for **scannable facts** only — not paragraphs in cells |
| **URLs** | Markdown links with labels — never raw 200-char URLs in table cells |
| **Why / watch-outs** | Prose paragraphs, not table rows |
| **Actionability** | At least one `- [ ]` or `1.` in full document (validation unchanged) |

### Anti-patterns (skill must forbid)

- Six-row `Field | Detail` tables with essay-length cells  
- Repeating the full memo in chat after create  
- Invented amounts, deadlines, eligibility  
- More than five programs  
- Pasting verification URL lists into body markdown  

### Optional update field (tool v5)

| Field | When | Written to |
|-------|------|------------|
| `changeSummary` | Update only (`artifactId` set) | `meta.snapshot.json` + optional PDF cover line |

---

## Print design system

### Goal

The PDF should read as a **professional consultant memo**, not generic `marked` + system fonts. Agency stays in Penny’s words; the **template** supplies credibility.

### Pipeline (unchanged mechanism, upgraded styling)

```text
document.md (version n)
  → composePdfMarkdown (+ verification appendix from snapshot)
  → renderMarkdownToPrintHtml (marked + sanitize)
  → wrap with artifact-print.css (+ optional structure pass)
  → Chromium print → brief.pdf
```

### `artifact-print.css` requirements (v1)

| Element | Spec |
|---------|------|
| Page | US Letter, margins ~0.75in |
| Type | Distinct heading + body pairing (e.g. serif H1, sans body — use Penny brand tokens where defined) |
| Cover block | Title 20–22pt; subtitle/meta 11pt; version line `v{N} · Prepared {date}` |
| Change line | If `changeSummary` set: italic subline under version |
| H2 | Section breaks with spacing; optional thin rule |
| H3 program | Keep-with-next friendly; rank visible |
| **Verdict** | Styled badge from `**Verdict:**` line (CSS class injection in post-pass or marked extension) |
| **Next step** | Highlight band (left border + light fill) — must be obvious on paper |
| Tables | Max width 100%; smaller font (9–10pt); zebra optional; `word-break` on URLs |
| Task lists | Printable checkbox (existing `.task-checkbox`) |
| Links | Underlined; show label text, not full URL in print when label present |
| Footer | Running footer: `Page {n} · {title} · v{version}` |
| Verification appendix | Smaller type (9pt); page break before `## Verification` |

### Structure pass (v1 recommended)

Post-markdown HTML pass (new `shared/artifact-print-structure.ts`):

1. Detect `**Verdict:**` / `**Next step:**` paragraphs → wrap with semantic classes.  
2. Detect `### N.` headings → wrap program block in `<section class="program-block">`.  
3. Best-effort; if no match, pass through unchanged.

**Not** a second content model — presentation only.

### Preview fidelity

Print CSS is the **only** stylesheet for PDF. Panel does not load it. WYSIWYG holds because preview renders the **generated PDF**.

---

## Tool contract

### `create_funding_brief` (unchanged name)

| Field | Required | Notes |
|-------|----------|-------|
| `bodyMarkdown` | yes | Written to `versions/{n}/document.md` |
| `title` | yes | Snapshot title |
| `triggerReason` | yes | |
| `verification` | yes | |
| `evidence.programs` | no | 0–5 |
| `artifactId` | no | If set → update (new version) |
| `changeSummary` | no | Recommended on update |

**Never** persist `bodyMarkdown` inside JSON except as files on disk.

### Validation (unchanged + optional)

- Non-empty `bodyMarkdown`  
- At least one `- [ ]` or `1.` step  
- `verification.urlsChecked` — ≥1 HTTPS URL  
- `changeSummary` max length 280 chars if present  

### Return payload (extend)

```ts
{
  success: true;
  artifactId: string;
  sessionUuid: string;
  title: string;
  programCount: number;
  version: number;        // the version just written
  latestVersion: number;  // alias of version for this write
  documentPath: string;
  pdfPath: string;
}
```

---

## API

### `GET /api/artifacts/[id]`

| Query | Response |
|-------|----------|
| `preview=pdf` | PDF bytes for `version` query (default: latest) |
| `version={n}` | Select snapshot (400 if missing, 404 if no PDF) |
| (default) | JSON metadata + version list |

### JSON response (default)

```ts
{
  artifact: {
    artifactId: string;
    title: string;
    programCount: number;
    latestVersion: number;
    updatedAt: string;
    pdfAvailable: boolean;
  };
  versions: Array<{
    version: number;
    title: string;
    updatedAt: string;
    pdfAvailable: boolean;
    changeSummary?: string;
  }>;
}
```

### `GET /api/artifacts/[id]/download`

| Query | Behavior |
|-------|----------|
| `format=pdf` | Required |
| `version={n}` | Default latest |
| Headers | `content-disposition: attachment; filename="{sanitized-title}.pdf"` |

### Security

- Same session key + artifact id checks as today  
- `version` must be positive integer ≤ `latestVersion` and folder must exist  
- No path traversal  

---

## Web UI

### Components

| Component | Responsibility |
|-----------|----------------|
| `ArtifactPanel.svelte` | Shell, width, version state, multi-artifact tabs |
| `ArtifactToolbar.svelte` | Title, meta, version `<select>`, download link with version query |
| `DocumentPreview.svelte` | PDF.js — **keep**; add `version` prop to URL |
| `ArtifactVersionSelect.svelte` | *(new)* version dropdown |

**Do not build:** `ActionListDoc*` components from withdrawn panel spec.

### State

- `selectedVersion` defaults to `latestVersion` on open and on `artifact.update`  
- User picking older version sticks until latest bump (then reset to latest — configurable; **default: reset to latest on update**)  

### Chat integration

| Event | Behavior |
|-------|----------|
| `artifact.create` | Auto-open panel (unchanged) |
| `artifact.update` | Refresh version list; preview latest; toolbar “Updated to v{N}” |
| Chip | `ArtifactPlanNudge` — unchanged |

### SSE payload

Include `version` and `latestVersion` on `artifact.create` / `artifact.update` (already has `version`; align naming).

---

## Penny agent integration

### When to create vs update

| Situation | Action |
|-----------|--------|
| First plan in session | Create (`artifactId` omitted) |
| Material new programs, changed recommendation, new facts | Update (same `artifactId`) |
| Typo only | Chat fix; optional update if user cares |

### Chat copy after write

> I’ve updated your funding memo to **v3** — open the panel to preview or download the PDF. It’s the same file you’ll share with your team.

Include `changeSummary` in tool call when the delta is non-obvious.

### Skill updates (`penny-artifacts`)

- Remove “memory/action list” / “panel ≠ PDF” language  
- Add memo spine, per-program module, anti-patterns  
- Add `changeSummary` on update  
- Emphasize WYSIWYG: panel shows the downloadable memo  

### `AGENTS.md` workflow

Unchanged order: corpus → official source → (web search) → `create_funding_brief` after verified recommendations.

---

## Migration

### Format v4 → v5

On read or lazy migration job when loading artifact:

1. If `versions/` missing and root `document.md` exists:  
   - Create `versions/1/`  
   - Move (or copy) `document.md`, `brief.pdf` → `versions/1/`  
   - Build `meta.snapshot.json` from current `meta.json`  
   - Set `latestVersion: meta.version`  
   - Rewrite root `meta.json` to v5 shape  
2. If `versions/` already present — no-op  
3. Delete root-level `document.md` / `brief.pdf` after successful migration  

### Legacy artifacts without `document.md`

- PDF-only: show preview/download if `brief.pdf` exists under latest version path  
- Message: “Source markdown unavailable for this version”  

### Withdrawn spec

`2026-06-03-funding-artifact-panel-memory-action-doc.md` — mark **Superseded** at top; do not implement.

### Amend `2026-06-02-funding-artifact-markdown-pdf.md`

When this spec is approved:

- Affirm **Preview = download** (same bytes, selected version)  
- Replace flat file layout with `versions/{n}/`  
- Point web panel section to this spec  
- Bump `formatVersion` to 5  

---

## Open decisions (resolve in implementation plan)

| # | Decision | Recommendation |
|---|----------|----------------|
| 1 | Failed PDF for version `n` — advance `latestVersion`? | Yes, with `pdfAvailable: false` and error UI |
| 2 | Font licensing | Use Penny brand stack / Google fonts allowed in Chromium print |
| 3 | `changeSummary` in tool schema | Optional v5 field |
| 4 | Version list cap in API | Return all versions v1 (typically &lt;20) |
| 5 | Regenerate PDF from existing markdown without new version | Out of scope v1 (admin/debug only) |

---

## Implementation order

1. **Paths + v5 types** — `penny-paths`, `artifact-types`, `ARTIFACT_FORMAT_VERSION = 5`  
2. **Storage** — `persistArtifactFiles` writes version folders; migration helper  
3. **Plugin tool** — bump version logic; optional `changeSummary`  
4. **Print CSS v1** — verdict/next-step/program block + footer  
5. **API** — `version` query param; JSON version list  
6. **Web** — toolbar version select, preview URL, download URL  
7. **Skill + docs** — `penny-artifacts`, supersede panel spec, amend markdown-pdf spec  
8. **Tests** — storage round-trip, API version 404, migration fixture, print structure pass  

---

## Success criteria

- [ ] Each update creates `versions/{n}/` without overwriting prior versions  
- [ ] User can preview and download **any** retained version’s PDF  
- [ ] Preview bytes === download bytes for the same `version` query  
- [ ] Panel does **not** render a separate markdown/layout document  
- [ ] PDF uses upgraded print design (cover, next-step band, program blocks, footer)  
- [ ] Penny skill documents memo spine, per-program module, and anti-patterns  
- [ ] `changeSummary` appears in PDF cover when provided on update  
- [ ] v4 artifacts migrate to v5 on read  
- [ ] Withdrawn panel spec marked superseded; no `ActionListDoc` implementation  
- [ ] Consultation mode section names still respected in authoring  

---

## Spec cross-reference

| Document | Relationship |
|----------|--------------|
| `2026-06-02-funding-artifact-markdown-pdf.md` | Amended (layout + panel pointer) |
| `2026-06-03-funding-artifact-panel-memory-action-doc.md` | **Superseded** |
| `2026-06-03-consultation-modes.md` | Authoring sections |
| `2026-06-02-funding-strategy-document.md` | Historical playbook philosophy; placeholders remain forbidden |

---

## Spec self-review

| Check | Result |
|-------|--------|
| User goal | Consultant memo, WYSIWYG, versions, pretty PDF |
| Single source | `document.md` per version only |
| No duplicate panel doc | PDF preview only |
| Scope | v1 explicit; interactive edit / diff UI deferred |
| Implementable | Maps to existing tool, storage, PDF.js, print HTML pipeline |
