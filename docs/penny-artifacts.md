# Penny funding artifacts

Production-ready artifacts: agent-authored markdown → PDF, server-side persistence per chat session.

## Overview

- **Penny writes markdown** (`bodyMarkdown`) — brief pages first, strategy pages after.
- **System generates PDF** (`brief.pdf`) — same file for panel preview and download.
- Panel renders PDF pages with PDF.js (no HTML iframe).

## When Penny creates artifacts

Penny calls `publish_funding_brief` when:

- The user asks for a brief, strategy, PDF, or export, or
- Two or more verified programs are delivered with execution detail.

See `workspace/skills/penny-artifacts/SKILL.md` for agent workflow.

## Storage layout (format v4)

```
workspace/artifacts/<session-uuid>/<artifact-id>/
  document.md      # canonical content (only copy)
  brief.pdf        # generated deliverable
  meta.json        # title, version, verification, optional evidence
```

Legacy `brief.json` and `slides.html` are removed on the next create/update.

## SSE events

- `artifact.create` — new artifact (version 1)
- `artifact.update` — revised artifact (version N+1)

Emitted after `publish_funding_brief` or legacy `create_funding_brief` completes.

## Verification

```bash
./scripts/verify_penny_artifacts.sh
```

Requires Playwright for full PDF smoke. Use `--skip-pdf` if document-only smoke is enough.

## Tool

`publish_funding_brief` — model-facing tool registered in `penny-tools`, allowed in `config/openclaw.penny.example.json5`.

Required: `title`, `bodyMarkdown` (with checklist or numbered steps), `verifiedUrls`.

Optional: `notes`.

Penny still keeps `create_funding_brief` internally as the strict artifact action. `publish_funding_brief` fills trigger reason, verification time, and evidence metadata so the model does not have to guess internal schema fields.

Example tool result:

```json
{
  "success": true,
  "artifactId": "...",
  "title": "...",
  "programCount": 3,
  "version": 1,
  "documentPath": ".../document.md",
  "pdfPath": ".../brief.pdf"
}
```
