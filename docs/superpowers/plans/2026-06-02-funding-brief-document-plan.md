# Funding Brief Document Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement task-by-task.

**Goal:** Replace slideshow artifacts with agent-authored letter-size documents.

**Architecture:** `bodyMarkdown` + structured `programs[]`; renderer paginates HTML into letter pages; shared neutral tokens; same HTML for preview and PDF.

**Tech Stack:** TypeScript, marked, Playwright PDF, SvelteKit iframe preview

---

### Task 1: Schema + validation

- [x] Add `bodyMarkdown`, `formatVersion` to types
- [x] Require `bodyMarkdown` in validator
- [x] Keep `business` optional

### Task 2: Shared markdown + tokens

- [x] `shared/brief-markdown.ts` with marked + sanitization
- [x] Neutral `penny-brand.ts` tokens

### Task 3: Document renderer

- [x] `funding-brief-document.ts` + assets
- [x] Program placeholders + legacy fallback
- [x] Remove slide deck files

### Task 4: PDF + plugin wiring

- [x] `render_document_pdf.py` Letter format
- [x] Update action + tool schema

### Task 5: Web preview

- [x] `DocumentPreview.svelte`
- [x] Embedded scroll styles

### Task 6: Docs, skills, tests

- [x] Update penny-artifacts skill + docs
- [x] Update all tests + smoke script
- [x] Run verify_penny_artifacts.sh
