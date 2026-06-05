# Penny Behavioral Baseline Eval

This eval measures whether Penny behaves like a Canadian business funding consultant with a case file, not a generic funding search box.

## Execution Surface

Use only:

```bash
openclaw agent --local --session-id <case-session-id> --message "<golden prompt>" --json
```

Do not mix web chat and local agent runs in the same baseline.

## Baseline Freeze

Before running cases, record:

- repo commit
- branch
- OpenClaw config path
- model
- corpus file path
- corpus checksum
- run date

Do not change Penny code, skills, config, model, or corpus during the 50-case baseline.

## Case Protocol

1. Use a fresh session ID per case.
2. Send only the matrix golden prompt.
3. If Penny asks a gate-changing question and the matrix has an allowed follow-up, send that follow-up.
4. Let the run finish.
5. Save agent JSON, session JSONL path, trace score, final answer text, artifact metadata, and manual scoring row.

## Outputs

- Raw run outputs live under `runs/<run-id>/`.
- Final reports live under `reports/<run-id>/`.
- `baseline-report.md` states what failed and how often.
- `fix-backlog.md` orders fixes by severity times frequency.
