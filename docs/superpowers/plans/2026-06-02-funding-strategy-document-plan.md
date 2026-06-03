# Funding Strategy Document Implementation Plan

> **Goal:** Turn the artifact into an agent-authored, print-ready funding strategy with optional structured program playbooks.

**Architecture:** Extend `programs[]` with optional playbook fields; agent writes strategy in `bodyMarkdown`; shared playbook renderer emits sections only when data exists; format v3.

---

- [x] Spec: `docs/superpowers/specs/2026-06-02-funding-strategy-document.md`
- [x] Types + validation (v3, optional playbook fields, actionable gate)
- [x] `funding-brief-playbook.ts` + checkbox markdown + CSS
- [x] Document renderer + tool schema + skill + UI labels
- [x] Tests + verify script
