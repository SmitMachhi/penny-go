# Plan: Finish Phase 1 and choose how you run Penny

Goal: Penny runs end-to-end on your laptop with **corpus → live verify (`read_official_source`) → optional Exa search**, using the **`penny-go/workspace`** playbook and **`penny-tools`** plugin.

**Exit criteria (“Phase 1 done-done”):**

- Corpus verifier passes (**331** profiles baseline).
- Plugin tests pass (`cd plugin && npm test`).
- Python reader succeeds on **one HTML + one PDF** URL from the setup doc smoke block.
- **Path A + Path B** agent runs show plausible tool traces (`search_corpus` first when relevant; **`read_official_source` before recommending** discovered programs).
- `~/.openclaw/` has working **DeepSeek** + **Exa** credentials for whichever runtime you pick (embedded vs gateway daemon).

References: **`docs/penny-local-setup.md`**, **`config/openclaw.penny.example.json5`**.

---

## Phase A — Runtime choice (pick one before heavy config)

| Mode | Best when | Rough flow |
| ---- | --------- | ----------- |
| **Embedded** (`openclaw agent --local`) | Fast tasting, no daemon | Shell has env or `openclaw` loads `~/.openclaw/.env`; fewer moving parts |
| **Gateway daemon** | Always-on CLI / future UI | Install/start gateway; restart after config edits |

Decision: _________ (embedded / gateway).

---

## Phase B —Python + Crawl4AI reader

1. **Create venv** at repo root (`python3 -m venv .venv`).
2. **Install** `tools/requirements-read-official-source.txt`.
3. Run **`crawl4ai-setup`** (Playwright browsers).
4. **Smoke** stdin HTML + PDF commands from **`docs/penny-local-setup.md` §3**; both return JSON with **`success: true`** and usable **`markdown`**.
5. If `PENNY_PYTHON` in `~/.openclaw/.env` points here, bump it after `.venv` exists.

**Gate:** Step 4 green → continue.

---

## Phase C — Penny plugin build and install

1. `cd plugin` → `npm ci` (or `npm install`).
2. `npm test`.
3. `npm run plugin:build` → `npm run plugin:validate`.
4. **`openclaw plugins install /ABSOLUTE_PATH_TO/penny-go/plugin`** (use your real checkout path).
5. **`openclaw plugins inspect penny-tools --runtime`** — plugin loads without errors.

**Gate:** Inspect shows expected tools (**`search_corpus`**, **`read_official_source`**).

---

## Phase D — OpenClaw config merge (Penny behavior)

Copy fields from **`config/openclaw.penny.example.json5`** into **`~/.openclaw/openclaw.json`**:

- **`agents.defaults.workspace`** → **`/…/penny-go/workspace`** (absolute).
- **`agents.defaults.skills`** includes **`penny-funding`**.
- **`agents.defaults.model.primary`** → **`deepseek/deepseek-v4-flash`** (or override after auth works).
- **`tools`** — **minimal profile + explicit `allow`** (corpus tool, reader, `web_search` only; **`web.fetch` disabled**).
- **`plugins.entries`** — **`exa` enabled**; **`penny-tools` enabled** with **`corpusPath`**, **`pythonPath`**, **`repoRoot`** set to absolute paths **or** rely on **`PENNY_*`** env in `~/.openclaw/.env`.

Restart **gateway** (if using daemon): **`openclaw gateway restart`** (or follow install output).

**Smoke:** **`openclaw skills list`** includes **penny-funding** skill resolution for the workspace skill path.

---

## Phase E — Verification ladder (must follow order)

| Step | Command / action | Pass signal |
| ---- | ---------------- | ----------- |
| E1 — corpus | `cd database && python3 scripts/verify_funding_corpus.py` | Exits **0**, **331** profiles |
| E2 — plugin tests | `cd plugin && npm test` | **All tests pass** |
| E3 — reader smoke | stdin HTML + PDF (setup doc §3) | **`success: true`**, non-empty content |
| E4 — Path A | **`openclaw agent --local`** Ontario SaaS prompt (setup doc §6d) | **`search_corpus` before web search**; **`read_official_source`** per recommendation |
| E5 — Path B | **`openclaw agent --local`** Inuvik tourism prompt (setup doc §6e) | Corpus-first; weak hits → **`web_search`** → **`read_official_source`** |

**Recording:** Paste or save **`--json`** outputs / gateway logs for regressions later.

---

## Phase F — Hygiene after tasting

- **Rotate** DeepSeek + Exa keys when moving off throwaway keys; update **`~/.openclaw/.env`**; re-run **`openclaw onboard ... deepseek-api-key`** if auth profiles stop matching.
- Never commit **`.env`** or real keys; repo **`.env.example`** stays sample-only.

---

## Backlog (not Phase 1 — pick for later PRs)

- **UI:** SvelteKit (or other) chat front-end.
- **Hosting:** Fly.io / containers for gateway or app.
- **Product:** Auth, multi-tenant sessions, D1 or other persistence.
- **Data:** Scheduled corpus refresh / re-verify pipeline.
- **Integrations:** Browser harness, Firecrawl, QMD — only where they beat Crawl4AI + policy.

---

## One-page checklist (copy-friendly)

```
[ ] Phase A: chose embedded vs gateway
[ ] Phase B: venv + crawl4ai-setup + PDF/HTML reader smoke OK
[ ] Phase C: plugin install + inspect penny-tools OK
[ ] Phase D: merged config + gateway restart / env load OK
[ ] Phase E: E1 → E5 all pass (log Path A/B traces)
[ ] Phase F: key rotation noted for post-tasting
```

When every box is checked, Phase 1 is complete; next product slice is backlog item #1 of your roadmap.
