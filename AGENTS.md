## Code Rules
1. Strict TS: no `any`, unchecked casts, `var`, unused vars, or unsorted imports; default to `const`. 
2. Keep files ≤500 LOC, functions ≤50 LOC, complexity ≤10, nesting ≤3, and logic DRY.
3. No secrets in code, logs, or commits; validate external input at boundaries.
4. No magic numbers: name every numeric literal with a semantic constant.
5. Penny stays agentic: reasoning, context, evidence, tools, and model output drives decisions; deterministic code only frames tools, safety gates, and evidence constraints.

make sure penny thinks from first principles and works like a human consultant would just as ai agent. SHE MUST THINK FIRST PRINCIPLES.

## Commit Rules — MANDATORY, NO EXCEPTIONS
1. Auto-commit each verified logical change immediately.
2. Stage files explicitly by name; never use `git add .` or `git add -A`.
3. Commit messages: lowercase, ≤6 words, ironic sounding.
4. No trailers: Co-authored-by: Cursor cursoragent@cursor.com

## Source Code Reference
Before implementing against OpenClaw, Composio, QMD, or Browser Harness, read their source via `opensrc` — do not guess APIs or behavior from memory.

1. Resolve a local path: `opensrc path <ref>` (binary `/opt/homebrew/bin/opensrc`; cache `~/.opensrc/`, override with `OPENSRC_HOME`).
2. Search and read inside shell commands:
   ```bash
   rg "pattern" $(opensrc path <ref>)
   cat $(opensrc path <ref>)/path/to/file
   ```
3. Use the correct `<ref>` for each dependency:
   - OpenClaw → `openclaw/openclaw` or `openclaw`
   - Composio TS → `composiohq/composio` (not `@composio/core` — no repo metadata)
   - Composio Python → `pypi:composio`
   - QMD → `tobi/qmd` or `@tobilu/qmd`
   - Browser Harness → `browser-use/browser-harness`
