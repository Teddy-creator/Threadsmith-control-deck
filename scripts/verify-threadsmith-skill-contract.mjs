import { readFile } from "node:fs/promises";
import { join } from "node:path";

const skillDir =
  process.env.THREADSMITH_REPO_SKILL_DIR || join("codex", "skills", "threadsmith");

const checks = [
  {
    file: "SKILL.md",
    label: "decision state machine is explicit",
    patterns: [
      /## Decision State Machine/,
      /Recover gate/,
      /Acknowledgement gate/,
      /Project Charter Gate/,
      /Mode selection/,
      /Role selection/,
      /Output level/
    ]
  },
  {
    file: "SKILL.md",
    label: "short approvals execute instead of repeating recommendations",
    patterns: [
      /short approval/,
      /inherit that previous mode, role, and\s+action/,
      /re-summarize the same recommendation/
    ]
  },
  {
    file: "SKILL.md",
    label: "phase execution cadence pauses between phases, not roles",
    patterns: [
      /## Phase Execution Cadence/,
      /pause between phases, not between roles/,
      /## Execution Cadence Selector/,
      /Choose execution cadence by state, not only by wording/,
      /continuous.*approved phase can run through executor -> reviewer ->\s+verifier -> closeout/s,
      /npm run threadsmith:autopilot -- continue <project-root>/,
      /executor -> reviewer -> verifier -> closeout/,
      /Do not ask the operator to approve routine transitions/,
      /Do not stop merely because the next internal role is reviewer, verifier, or\s+closeout/,
      /下一内部 gate/
    ]
  },
  {
    file: "SKILL.md",
    label: "output matrix and orientation sections are required",
    patterns: [
      /## Output Matrix/,
      /exact field skeleton/,
      /Do not\s+satisfy full output by writing only these section headings with free-form\s+paragraphs/,
      /Full output sections/,
      /Internal progress output/,
      /已完成内部 gate/,
      /下一内部 gate/,
      /当前 stop reason/,
      /Compact sync output/,
      /Conceptual answer/,
      /### 本 phase 的结果/,
      /### 这一步具体做了什么/,
      /### 下一 phase 预览/,
      /### 你需要审核的点/
    ]
  },
  {
    file: "SKILL.md",
    label: "phase narrative output structure is explicit",
    patterns: [
      /render this exact skeleton/,
      /do not omit required labels/,
      /project state:/,
      /current phase state:/,
      /acceptance state:/,
      /phase 名称:/,
      /交付物:/,
      /结果一句话:/,
      /架构影响:/,
      /Before/,
      /Changed/,
      /After/,
      /Not changed/,
      /用户困惑/,
      /架构\/流程缺口/,
      /为下一步铺路/,
      /已运行:/,
      /未运行与风险:/,
      /Why now/,
      /Questions/,
      /Deliverables/,
      /Non-goals/,
      /Done when/
    ]
  },
  {
    file: "SKILL.md",
    label: "operator translation layer is explicit",
    patterns: [
      /### Operator Translation Rule/,
      /Every dense technical noun/,
      /技术名词：它在人话里意味着/,
      /capability-first phrasing/,
      /Do not let filenames, enum values, command names, or internal function names be the main explanation/
    ]
  },
  {
    file: "SKILL.md",
    label: "architecture layer explanation is explicit",
    patterns: [
      /架构\/流程缺口/,
      /项目 truth/,
      /role packet/,
      /Context Packet/,
      /runtime contract/,
      /action contract/
    ]
  },
  {
    file: "references/action-contracts.md",
    label: "phase narrative rule is documented",
    patterns: [
      /## Phase Narrative Rule/,
      /exact field skeleton/,
      /free-form paragraphs only/,
      /phase 名称/,
      /结果一句话/,
      /架构影响/,
      /Before/,
      /Changed/,
      /After/,
      /Not changed/,
      /用户困惑/,
      /架构\/流程缺口/,
      /未运行与风险/,
      /planner-style brief/,
      /what changed in this phase/
    ]
  },
  {
    file: "references/action-contracts.md",
    label: "operator translation rule is documented",
    patterns: [
      /## Operator Translation Rule/,
      /must not make the operator decode implementation vocabulary/,
      /capability-first wording/,
      /what it means in plain operator language/,
      /already user-facing or still only an internal foundation/
    ]
  },
  {
    file: "SKILL.md",
    label: "references use progressive disclosure",
    patterns: [
      /Load references only when needed/,
      /Read `references\/runtime-contract\.md`/,
      /Read `references\/role-contracts\.md`/,
      /Read `references\/action-contracts\.md`/,
      /Read `references\/external-agent-entry\.md`/
    ]
  },
  {
    file: "SKILL.md",
    label: "mode-specific read sets are documented",
    patterns: [
      /## Mode-Specific Read Sets/,
      /Read only what the selected mode needs/,
      /`sync`:/,
      /`drive`:/,
      /`continuous`:/,
      /`recover`:/
    ]
  },
  {
    file: "SKILL.md",
    label: "logical roles are explicit",
    patterns: [
      /Use planner, executor, reviewer, verifier, closeout, and hygiene as distinct roles/,
      /Prefer role ownership over person ownership/
    ]
  },
  {
    file: "references/action-contracts.md",
    label: "action state machine and anti-repeat invariant are documented",
    patterns: [
      /## Decision Ladder/,
      /Execution Cadence Selector/,
      /Anti-repeat invariant/,
      /execution-shaped/,
      /must not restate/,
      /## Output Level Rule/,
      /Direct conceptual answers are allowed/
    ]
  },
  {
    file: "references/action-contracts.md",
    label: "role chain cadence is documented",
    patterns: [
      /## Role Chain Cadence Rule/,
      /pauses between phases, not between routine roles/,
      /planner approval -> executor -> reviewer -> verifier -> closeout/,
      /Internal role transitions are not operator approval points/,
      /Use `下一内部 gate`/,
      /Reserve\s+`下一 phase 预览` for closeout/
    ]
  },
  {
    file: "references/role-contracts.md",
    label: "role transition table is documented",
    patterns: [
      /## Role Transition Table/,
      /Committed state signal/,
      /Next role/,
      /ready-for-verification/,
      /accepted-with-closeout-pending/,
      /Final state is accepted/,
      /Internal transitions inside an approved phase are not operator approval points/
    ]
  },
  {
    file: "SKILL.md",
    label: "full governance speed contract is explicit",
    patterns: [
      /## Full Governance Speed Contract/,
      /Hot-path governance should be rule-shaped/,
      /Named stop reasons/,
      /Context and observation budget/,
      /Verification levels/,
      /Sparse course-correction checks/
    ]
  },
  {
    file: "references/action-contracts.md",
    label: "full governance speed rule is documented",
    patterns: [
      /## Full Governance Speed Rule/,
      /role-complete, not approval-heavy/,
      /Hot-path governance must prefer deterministic checks/,
      /friction\s+budgets/
    ]
  },
  {
    file: "references/action-contracts.md",
    label: "deck-facing actions are marked deferred",
    patterns: [
      /Deck-facing actions are a deferred UI surface/,
      /frontend maintenance is\s+frozen/,
      /skill\/protocol truth is the authority/
    ]
  },
  {
    file: "references/action-contracts.md",
    label: "deterministic stop reasons are documented",
    patterns: [
      /## Deterministic Stop Reasons/,
      /`continue`/,
      /`pause_for_operator_decision`/,
      /`pause_for_blocker`/,
      /`pause_for_recovery`/,
      /`pause_for_release_action`/,
      /`pause_for_destructive_action`/,
      /`closeout_boundary`/
    ]
  },
  {
    file: "references/action-contracts.md",
    label: "context and observation budget rule is documented",
    patterns: [
      /## Context and Observation Budget Rule/,
      /current packet over full thread replay/,
      /selected role packet over all-role context/,
      /masked, trimmed, or summarized command output/,
      /proof of acceptance/
    ]
  },
  {
    file: "references/action-contracts.md",
    label: "staged verification rule is documented",
    patterns: [
      /## Staged Verification Rule/,
      /`narrow`/,
      /`standard`/,
      /`release`/,
      /Escalate on failed verification/
    ]
  },
  {
    file: "references/action-contracts.md",
    label: "sparse course-correction rule is documented",
    patterns: [
      /## Sparse Course-Correction Rule/,
      /lightweight course-correction check/,
      /repeating a recommendation/,
      /drifting from the approved phase/,
      /did verification evidence prove the done-when/
    ]
  },
  {
    file: "references/action-contracts.md",
    label: "next-step continuity is documented",
    patterns: [
      /## Next-Step Continuity Rule/,
      /Use exactly one continuity label/,
      /`new`/,
      /`continue`/,
      /`consolidate`/,
      /`gap-check`/,
      /making an active line of\s+work sound like a brand-new initiative/
    ]
  },
  {
    file: "references/action-contracts.md",
    label: "proposal review recovery action is documented",
    patterns: [
      /### `review-proposal`/,
      /writeback proposal exists/,
      /self-accept final state/,
      /Do not continue normal execution from a\s+proposal/
    ]
  },
  {
    file: "references/runtime-contract.md",
    label: "AGENTS.md first-run and gate matrix are documented",
    patterns: [
      /## Project Charter Gate Matrix/,
      /User previously declined setup/,
      /AGENTS.md contradicts `.threadsmith\/`/,
      /First-run charter prompt shape/,
      /Operational behavior/,
      /implementation remains blocked/
    ]
  },
  {
    file: "references/runtime-contract.md",
    label: "state boundary layers and external agent defaults are documented",
    patterns: [
      /## State Boundary Contract/,
      /project constitution/,
      /committed truth/,
      /derived packet/,
      /evidence/,
      /audit/,
      /runtime artifact/,
      /Summary is not state/,
      /External agents default to read-only plus writeback proposals/,
      /\.threadsmith\/proposals\/<proposal-id>\.json/,
      /\.threadsmith\/proposal-reviews\/<proposal-id>\.json/,
      /manual Threadsmith gate plan/
    ]
  },
  {
    file: "references/runtime-contract.md",
    label: "role write boundaries are documented",
    patterns: [
      /Role write boundaries/,
      /Planner may update phase\/status\/active work/,
      /Executor may change source and tests/,
      /Reviewer may write review conclusions/,
      /Verifier may write evidence and verification result/,
      /Closeout may record accepted state/,
      /Hygiene may refresh derived packets/
    ]
  },
  {
    file: "references/external-agent-entry.md",
    label: "external agent entry contract is documented",
    patterns: [
      /# External Agent Entry/,
      /read-only plus writeback proposals/,
      /\.threadsmith\/proposals\/<proposal-id>\.json/,
      /\.threadsmith\/proposal-reviews\/<proposal-id>\.json/,
      /does not by itself launch Claude, Codex CLI, or other providers automatically/
    ]
  },
  {
    file: "agents/openai.yaml",
    label: "default prompt reflects current workflow contract",
    patterns: [
      /resolve mode/,
      /committed Threadsmith truth/,
      /current phase chain/,
      /real gates or closeout boundaries/
    ]
  }
];

const failures = [];

for (const check of checks) {
  const contents = await readFile(join(skillDir, check.file), "utf8");
  for (const pattern of check.patterns) {
    if (!pattern.test(contents)) {
      failures.push(`${check.file}: ${check.label}: missing ${pattern}`);
    }
  }
}

console.log("Threadsmith skill contract check");
console.log(`Repository skill: ${skillDir}`);

if (failures.length === 0) {
  console.log("Result: contract checks passed");
  process.exit(0);
}

console.log("Result: contract checks failed");
for (const failure of failures) {
  console.log(`- ${failure}`);
}
process.exit(1);
