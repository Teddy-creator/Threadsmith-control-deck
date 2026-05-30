# Adaptive Work Session Mode v1 Closeout

## Result

Adaptive Work Session Mode v1 is implemented as a generic Threadsmith workflow
improvement. It is not project-specific, does not change frontend behavior, and
does not sync the repository skill to the installed global skill.

## Operator-Facing Behavior

Threadsmith can now distinguish a normal phase from a smaller work session
inside that phase. In plain language: when a direction is already accepted and
the next few actions are tightly related, Threadsmith may keep moving until a
natural stop instead of turning every small action into a new phase.

Closeout can now be tiered:

- `lite`: small low-risk work, with changed / verification / truth / next.
- `standard`: normal bounded implementation, with result, changed capability,
  verification, truth, remaining risk, and next phase.
- `audit`: release, PR / merge, public docs, destructive actions, architecture
  boundaries, provider routing, security, or cross-agent state. This still uses
  the full Threadsmith output contract.

Gap checks now have a budget. If a gap check already selected an implementation
path, the next normal action should be implementation unless a real stop reason
appears.

After three consecutive governance-heavy accepted sessions, Threadsmith can
recommend a lightweight value heartbeat. This is only an advisory route check;
it must not interrupt an already accepted implementation path.

## Runtime And Truth Shape

Runtime recommendations can carry deterministic labels:

- `work-session-continue`
- `gap-check`
- `value-heartbeat`

The labels are derived from state or explicit runtime signals. The skill
contract remains responsible for operator-facing wording and closeout templates.

Truth writeback remains durable-boundary based. Work-session internals should
not create new phases only to name the session. Blockers, failed verification,
scope changes, and user decisions still write durable truth immediately.

## Non-Goals Preserved

- No Asterlea-specific behavior.
- No frontend work.
- No multi-provider routing work.
- No release automation.
- No global skill sync.
- No weakening of destructive-action, release, provider, credential, or
  cross-agent stop gates.

## Verification

Expected verification for this implementation:

- `npm run verify:skill-contract`
- `npm run test --workspace @threadsmith/domain`
- `npm run test --workspace @threadsmith/runtime`
- `npm run test --workspace @threadsmith/orchestrator`
- `npm run verify:project-truth`
- `git diff --check`

`npm run verify:skill-sync` is intentionally omitted because this slice does
not sync the repository skill to the installed global skill.
