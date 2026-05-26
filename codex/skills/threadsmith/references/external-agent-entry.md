# External Agent Entry

Threadsmith can act as a project-level state store and cross-agent handoff
bridge without granting every agent direct write authority.

## Default Contract

Unknown or external agents default to read-only plus writeback proposals.

They may read:

- applicable `AGENTS.md`
- committed truth in `.threadsmith/*.json`
- `.threadsmith/context/current-packet.json`
- matching role packet in `.threadsmith/context/role-packets/<role>.json`
- `.threadsmith/context/evidence-summary.json`
- `.threadsmith/handoff/current-agent-handoff.md`
- timestamped packets in `.threadsmith/packets/`

They must not directly mutate committed truth unless the project explicitly
opts in to that provider/agent.

## Writeback Proposal Shape

When an external agent wants Threadsmith to adopt a state change, it should write
or return a proposal with:

- proposed target files
- proposed state changes
- evidence used
- residual risk
- whether the proposal needs Threadsmith review, recover, or rejection

Canonical proposal path:

```text
.threadsmith/proposals/<proposal-id>.json
```

Proposal reviews live at:

```text
.threadsmith/proposal-reviews/<proposal-id>.json
```

An accepted proposal is still not committed truth by itself. Threadsmith must
review and apply the safe update through its normal writeback boundary.

## Agent Prompt Shape

When handing work to another agent, include:

- project root
- source layer warning: committed truth beats packet and chat memory
- role being asked to perform
- files or artifacts it may read
- files it must not write
- expected proposal or evidence output
- stop conditions

## Not Yet Automated

This contract supports cross-agent collaboration and cross-thread handoff. It
does not by itself launch Claude, Codex CLI, or other providers automatically.
Automatic multi-provider routing remains future opt-in work.
