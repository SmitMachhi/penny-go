# GDPR readiness plan

Date: 2026-06-25

This is an engineering readiness plan, not legal advice or a compliance certification. It maps Penny's current codebase to GDPR-aligned controls so we can close the product and infrastructure gaps deliberately.

## Regulatory anchors

Official EU guidance used for this plan:

- European Commission data protection overview: https://commission.europa.eu/law/law-topic/data-protection/data-protection-explained_en
- Data-subject request handling: https://commission.europa.eu/law/law-topic/data-protection/rules-business-and-organisations/dealing-citizens/how-should-requests-individuals-exercising-their-data-protection-rights-be-dealt_en
- Data breach obligations: https://commission.europa.eu/law/law-topic/data-protection/rules-business-and-organisations/obligations/what-data-breach-and-what-do-we-have-do-case-data-breach_en
- International transfers and SCCs: https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/standard-contractual-clauses-scc_en

The core GDPR principles to design against are lawfulness, fairness and transparency; purpose limitation; data minimisation; storage limitation; accuracy; integrity and confidentiality; and accountability.

## Current implementation status

| Area | Status | Evidence |
| --- | --- | --- |
| Authenticated access | Partially implemented | App layout redirects unauthenticated users in `web/src/routes/(app)/+layout.server.ts`; API helpers require Supabase user context. |
| Tenant isolation | Partially implemented | Supabase RLS owns `public.penny_sessions`; API routes use ownership registry before reading session history/artifacts. |
| Right of access / portability | First backend slice implemented | `GET /api/privacy/export` exports owned session metadata, chat history, artifact summaries, and turn ledgers. |
| Right to erasure | First backend slice implemented | `POST /api/privacy/delete` deletes all owned Penny sessions after `DELETE_MY_PENNY_DATA` confirmation. |
| Storage limitation | Not complete | No production retention window or scheduled purge exists yet. |
| Data minimisation | In progress | Persistent browser transcript cache was removed; runtime workspace data still needs retention controls. |
| Breach evidence | Partially implemented | Privacy export/delete emit structured audit events; broader session reads, auth failures, and operator access still need coverage. |
| International transfers | Not complete | Vendors/subprocessors and SCC/DPA coverage are not documented in repo. |
| DPIA | Not complete | AI-agent processing should be screened for DPIA need before EU launch. |

## Data inventory

| Data store / processor | Personal data likely present | Purpose | Current control | Gap |
| --- | --- | --- | --- | --- |
| Supabase Auth | Email, auth identifiers, session cookies/tokens | Account creation and login | Supabase auth; email confirmation enabled in config | Need DPA/subprocessor record, production MFA policy decision, account deletion flow. |
| `public.penny_sessions` | User id, session key, session title, timestamps | Owned session index | RLS with `user_id = auth.uid()` | Need audit logging for list/create/update/delete. |
| OpenClaw gateway/session store | User prompts, assistant responses, generated reasoning context, run ids | Agent conversation runtime | Web routes check ownership before gateway access | Need source-level isolation proof, export/delete verification, and retention policy. |
| Fly volume `/app/workspace` | Artifacts, turn ledgers, engagement memory, OpenClaw state | Runtime persistence | UUID-scoped paths and per-session delete helpers | Need scheduled retention purge and backup deletion policy. |
| Artifact PDFs/markdown/meta | Business details, funding plans, user-provided company facts | User deliverables | Session-scoped storage, owned route checks | Export currently returns summaries, not full document/PDF bytes. Need decide access format. |
| Browser memory cache | Current tab chat state | In-tab UX speed | Memory-only cache | Good for data minimisation; no persistent transcript cache remains. |
| Server logs/platform logs | Request paths, errors, maybe user/session identifiers | Operations and incident response | Internal errors are no longer returned to clients | Need log redaction policy, retention window, and access controls. |
| External research/model services | Prompt content, source URLs, generated outputs, scraped page content | Funding research and model inference | Config-driven integrations | Need subprocessor list, DPAs/SCCs, and prompt minimisation rules. |

## Data-subject request coverage

| GDPR request | Current behavior | Required next work |
| --- | --- | --- |
| Access | `GET /api/privacy/export` returns owned Penny session metadata, normalized chat messages, artifact summaries, and turn ledgers. | Add user-facing UI, include full artifact document/PDF exports if required, and include Supabase account metadata. |
| Portability | Export is JSON and tied to the authenticated user. | Stabilize JSON schema and document it. |
| Erasure | `POST /api/privacy/delete` deletes owned Penny sessions via existing session deletion path. | Add Supabase account deletion, backup deletion policy, deletion audit evidence, and verification for OpenClaw storage. |
| Rectification | Users can rename sessions, but not edit stored prompts/artifacts. | Decide whether correction means deleting/regenerating affected sessions/artifacts. |
| Restriction / objection | No product flow. | Add manual operational intake or account-level flags before EU launch. |
| Automated decision-making | Penny is advisory; no code path currently makes binding eligibility decisions. | Document this in privacy notice and prevent product copy from implying automated final decisions. |

## API contract

### Export

```http
GET /api/privacy/export
```

Returns:

- `userId`
- `exportedAt`
- `sessions[]`
- each session's metadata, chat history, artifact summaries, and turn ledger entries

### Delete

```http
POST /api/privacy/delete
Content-Type: application/json

{ "confirm": "DELETE_MY_PENNY_DATA" }
```

Returns:

- `userId`
- `deletedAt`
- `deletedSessionCount`
- `deletedSessionKeys`

This deletes all owned Penny sessions through `deletePennySession`, which calls gateway transcript deletion plus workspace artifact, turn-ledger, engagement-memory, and ownership-row cleanup.

## High-priority GDPR backlog

| ID | Priority | Work | Notes |
| --- | --- | --- | --- |
| GDPR-001 | High | Extend structured privacy audit events beyond export/delete to session reads/session deletes/auth failures | Initial export/delete audit events are implemented; broader coverage is still needed for accountability and breach investigation. |
| GDPR-002 | High | Prove OpenClaw tenant isolation from source and runtime tests | Use `opensrc path openclaw/openclaw` before touching OpenClaw-specific behavior. |
| GDPR-003 | High | Add retention config and scheduled purge | Cover OpenClaw state, artifacts, turn ledgers, engagement memory, logs, and backups. |
| GDPR-004 | High | Add user-facing privacy controls | Export data, delete Penny data, and link privacy notice from authenticated UI. |
| GDPR-005 | High | Create subprocessor and transfer register | Supabase, Fly.io, OpenClaw/model providers, Firecrawl/Exa or other research tools. Include SCC/DPA status. |
| GDPR-006 | Medium | Add privacy notice draft | Explain data categories, purposes, legal basis, retention, subprocessors, user rights, and contact path. |
| GDPR-007 | Medium | Screen for DPIA | AI-agent processing and business profiling may justify a DPIA depending on EU launch scope and customer segment. |
| GDPR-008 | Medium | Add full artifact export support | Current export returns artifact summaries. Full markdown/PDF export may be required for access/portability. |

## Open questions

1. Will EU/EEA users be allowed at launch, or blocked until privacy operations are ready?
2. Which model/research providers are production subprocessors, and where are they hosted?
3. Should erasure delete the Supabase auth account or only Penny workspace data?
4. What retention window should apply to inactive chats and generated artifacts?
5. Who receives privacy requests and breach alerts operationally?
