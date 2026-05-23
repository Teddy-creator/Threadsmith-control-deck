# Cross-Agent Proposal Fixtures

These fixtures show how external agents should return Threadsmith writeback
proposals, and how Threadsmith reviews them.

They are examples for Cross-Agent State Bridge v1. They do not grant external
agents direct write access to committed `.threadsmith/*.json` truth.

## Fixture Matrix

| Fixture | Provider style | Expected result | Why |
| --- | --- | --- | --- |
| `happy-path-claude-review.json` | Claude-like reviewer | `accept-plan` | Proposal is for the current phase, newer than committed truth, and has passed evidence. |
| `stale-generic-review.json` | Generic agent | `needs-recovery` | Proposal was created before committed truth freshness. |
| `wrong-phase-codex-review.json` | Codex-like delegated worker | `needs-recovery` | Proposal targets an old phase. |
| `unsafe-self-acceptance.json` | External agent | schema rejection | External agents cannot set proposal status to `accepted`. |

## How To Verify

Run:

```bash
npm run smoke:proposal-fixtures
```

The smoke creates a temporary Threadsmith project, loads each fixture, and
asserts the expected review behavior.

## Operator Reminder

`accept-plan` means "this can enter a manual Threadsmith adoption gate." It does
not mean committed truth was changed.
