# Penny artifacts

Production-ready Claude-style artifacts for funding briefs: branded HTML slideshow preview, PDF download, server-side persistence per chat session.

## What users see

- Chat stays short and conversational.
- Substantial recommendations appear in the **artifact panel** (right side on desktop, full-screen overlay on mobile).
- Each artifact is a slide deck with Penny branding, one slide per program, plus executive summary.
- Users can **download PDF** from the toolbar.

## Agent behavior

Penny calls `create_funding_brief` when:

- The user asks for a brief, deck, slides, PDF, or export, or
- She delivers two or more verified program recommendations with full detail.

See [`workspace/skills/penny-artifacts/SKILL.md`](../workspace/skills/penny-artifacts/SKILL.md).

## Storage layout

```
workspace/artifacts/<sessionUuid>/<artifactId>/
  brief.json
  slides.html
  brief.pdf
  meta.json
workspace/artifacts/<sessionUuid>/index.json
```

Cross-device access: BFF and OpenClaw gateway must share the same `PENNY_REPO_ROOT` (persistent volume). Artifacts load via session key — not browser localStorage.

## Web API

| Route | Purpose |
| ----- | ------- |
| `GET /api/artifacts?sessionKey=` | List artifacts for session |
| `GET /api/artifacts/:id?sessionKey=&preview=html` | Slideshow HTML preview |
| `GET /api/artifacts/:id?sessionKey=` | Artifact metadata (JSON) |
| `GET /api/artifacts/:id/download?sessionKey=&format=pdf` | PDF download |

## SSE events

- `artifact.create` — new brief (version 1)
- `artifact.update` — same `artifactId`, version bumped

Emitted after `create_funding_brief` tool completes.

## Verification

```bash
chmod +x scripts/verify_penny_artifacts.sh
./scripts/verify_penny_artifacts.sh
```

Requires Playwright browsers for PDF step (same as Crawl4AI setup). Use `--skip-pdf` if slides-only smoke is enough.

## Plugin tool

`create_funding_brief` — registered in `penny-tools`, allowed in `config/openclaw.penny.example.json5`.

The tool binds to the active OpenClaw session key at runtime (`agent:main:penny:<uuid>`). The agent does not pass a session id.

Returns:

```json
{
  "success": true,
  "artifactId": "...",
  "sessionUuid": "...",
  "title": "...",
  "programCount": 3,
  "previewPath": ".../slides.html",
  "pdfPath": ".../brief.pdf",
  "version": 1
}
```
