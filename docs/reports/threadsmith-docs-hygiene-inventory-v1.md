# Threadsmith Docs Hygiene Inventory v1

## Result

`docs/plans` currently contains 41 plan documents. That is high enough to make
current authority harder to infer from file names alone, but not high enough to
justify a broad archive or reorganization inside Human-Centered Governance v1.

## Plan Families

- release / version hardening: `v0.2.*`, `v0.3.0-*`, release-hardening plans
- workflow repair and cadence: role-chain cadence, full-governance speedup,
  adaptive work session, human-centered governance
- state and context: context packet regeneration, context routing / budget,
  phase history, truth confidence
- cross-agent bridge: project state store, bridge refresh, proposal visibility,
  proposal review, adoption / roundtrip
- architecture hygiene: architecture hygiene, workflow split,
  performance / redundancy hygiene
- operator experience: phase narrative output, operator translation layer,
  bridge operator workflow

## Recommendation

Do not reorganize or archive `docs/plans` in this slice. Treat this inventory as
the current evidence that an index is becoming useful.

Recommended follow-up:

- create `docs/plans/index.md` in a separate narrow slice
- group plans by family and mark accepted / historical / active
- keep `.threadsmith` as current state authority; use docs as reusable rationale
  and implementation history

## Boundary

This report does not move, delete, rename, or archive any plan file.
