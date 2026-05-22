# Drift Guardrails v1 Implementation Plan

Goal: prevent Threadsmith's canonical repo skill, installed global skill, and
committed `.threadsmith` truth from silently drifting apart again.

Scope:

- Add a read-only verification command that compares the repository skill source
  with the installed global `$threadsmith` skill.
- Report missing files, extra files, and changed file contents clearly.
- Keep the command safe: it must not install, copy, delete, or overwrite global
  skill files.
- Record the current phase and closeout truth in `.threadsmith/`.

Non-goals:

- Modifying frontend or Control Deck UI.
- Installing or overwriting `/Users/cloud/.codex/skills/threadsmith`.
- Publishing a release.
- Implementing multi-provider.
- Reworking skill orchestration schemas beyond this guardrail.

## Design

Add `scripts/verify-threadsmith-skill-sync.mjs`.

Default behavior:

- repo source: `codex/skills/threadsmith`
- installed skill: `$CODEX_HOME/skills/threadsmith`, or
  `~/.codex/skills/threadsmith` when `CODEX_HOME` is unset
- compare regular files recursively
- ignore hidden OS metadata such as `.DS_Store`
- exit `0` when both trees match
- exit `1` when drift is detected

Environment overrides:

- `THREADSMITH_REPO_SKILL_DIR`
- `THREADSMITH_INSTALLED_SKILL_DIR`

Package script:

```bash
npm run verify:skill-sync
```

## Done When

- The drift check catches the current repo/global skill mismatch.
- The check passes when repo and installed paths are intentionally pointed at
  the same tree for smoke coverage.
- `.threadsmith` current phase and acceptance state describe this guardrail
  honestly.
- Existing focused tests still pass.

## Verification

```bash
npm run verify:skill-sync
THREADSMITH_INSTALLED_SKILL_DIR=codex/skills/threadsmith npm run verify:skill-sync
node -e "const fs=require('fs'); for (const f of fs.readdirSync('.threadsmith')) if (f.endsWith('.json')) JSON.parse(fs.readFileSync('.threadsmith/' + f, 'utf8'))"
git diff --check
npm run test --workspace @threadsmith/runtime -- projectCharterGate.test.ts
npm run test --workspace @threadsmith/orchestrator
```

Expected note: the default `npm run verify:skill-sync` may intentionally fail
until the user chooses to sync/install the global skill. That failure is the
guardrail doing its job, not a product bug.
