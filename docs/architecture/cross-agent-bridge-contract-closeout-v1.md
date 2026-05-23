# Cross-Agent Bridge Contract Closeout v1

> Status: implementation closeout in progress.
> Scope: project state store / cross-agent bridge v1.

## One-Line Contract

Threadsmith v1 can act as a local project state store and cross-agent handoff
bridge. It lets another agent read the same project truth, work inside a narrow
role boundary, and return a reviewable writeback proposal.

It does not make external agents automatic executors, and it does not let them
mutate committed project truth by default.

## What V1 Supports

- Project-level truth stored in `AGENTS.md` and `.threadsmith/*.json`.
- A documented truth boundary between committed truth, derived packets,
  evidence, audit trail, and runtime artifacts.
- Deterministic state bridge smoke for proposal and proposal-review artifacts.
- Operator guide for giving an external agent a narrow Threadsmith-compatible
  task.
- Fixed handoff packet at `.threadsmith/handoff/current-agent-handoff.md`.
- Adapter prompts at `.threadsmith/adapters/codex.md`,
  `.threadsmith/adapters/claude.md`, and
  `.threadsmith/adapters/generic-agent.md`.
- Manual adoption plan semantics for `accept-plan`.

## What V1 Does Not Support

- No automatic multi-provider execution.
- No direct external-agent writes to committed truth by default.
- No proposal review UI.
- No guarantee that a generated adapter prompt is fresh unless regenerated from
  current truth.
- No replacement for the user's conductor chat surface.
- No frontend redesign in this closeout slice.

## Authority Layers

| Layer | Example paths | Contract |
| --- | --- | --- |
| Project constitution | `AGENTS.md` | Highest project-level rules. |
| Committed truth | `.threadsmith/project-status.json`, `.threadsmith/current-phase.json`, `.threadsmith/acceptance-state.json` | Current accepted project state. |
| Derived handoff | `.threadsmith/handoff/current-agent-handoff.md`, `.threadsmith/adapters/*.md` | Readable projections generated from truth. |
| Evidence | `.threadsmith/context/evidence-summary.json`, `.threadsmith/runs/*` | Proof used by verifier and closeout gates. |
| Proposal artifacts | `.threadsmith/proposals/*.json`, `.threadsmith/proposal-reviews/*.json` | External-agent suggestions and Threadsmith review results. |

If layers disagree, resolve in this order:

1. `AGENTS.md`
2. committed truth
3. evidence
4. derived handoff / adapter prompts
5. runtime artifacts
6. chat memory

## Operator Workflow

1. Confirm committed truth is fresh with `$threadsmith sync` or
   `npm run verify:project-truth`.
2. Regenerate the handoff packet with `npm run threadsmith:handoff -- .`.
3. Regenerate adapter prompts with `npm run threadsmith:adapters -- .`.
4. Give the relevant adapter prompt and a narrow role task to the external
   agent.
5. Ask the external agent to return results plus a writeback proposal instead
   of directly editing `.threadsmith/*.json`.
6. Review the proposal through Threadsmith gates.
7. Apply truth updates only through the correct role boundary and verification
   evidence.

## Command Surface

| Command | Purpose |
| --- | --- |
| `npm run verify:project-truth` | Confirms committed truth files are schema-valid and readable. |
| `npm run smoke:state-bridge` | Verifies isolated writeback proposal and proposal-review behavior. |
| `npm run threadsmith:handoff -- .` | Generates the fixed current-agent handoff packet from current truth. |
| `npm run threadsmith:adapters -- .` | Generates provider-specific adapter prompts from current truth. |
| `git diff --check` | Catches whitespace and diff hygiene issues before closeout. |
| `jq empty .threadsmith/*.json` | Catches malformed top-level committed truth JSON. |

## Verification Map

This contract is considered valid when:

- project truth loads successfully;
- state bridge smoke proves `accept-plan` does not mutate committed truth;
- handoff packet generation points to the current phase;
- adapter prompt generation points to the current phase;
- docs describe proposal review as manual gate, not automatic adoption;
- `.threadsmith` committed truth records this closeout slice honestly.

## Failure And Recovery Conditions

Route to recover if:

- `AGENTS.md` conflicts with `.threadsmith` truth;
- generated handoff or adapter prompts name an old phase;
- an external agent claims final acceptance without evidence;
- a proposal tries to mutate committed truth directly;
- acceptance says `accepted` while git diff still contains unreviewed work;
- verification evidence is missing or stale.

## Next Recommended Slices

- Bridge UX hardening: make stale handoff / stale adapter warnings clearer.
- Proposal review workflow: add a deterministic command that reviews a proposal
  and emits an adoption plan or rejection.
- External-agent fixture pack: add sample Codex / Claude / generic-agent
  proposal fixtures.
- Cross-agent state contract tests: expand schema checks around proposal
  freshness and authority boundaries.

