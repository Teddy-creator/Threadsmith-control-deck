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
    label: "output matrix and orientation sections are required",
    patterns: [
      /## Output Matrix/,
      /Full output sections/,
      /Compact sync output/,
      /Conceptual answer/,
      /### 上一步做了什么/,
      /### 下一步具体要做什么/,
      /### 当前架构位置/
    ]
  },
  {
    file: "SKILL.md",
    label: "architecture layer explanation is explicit",
    patterns: [
      /架构影响或涉及对象/,
      /项目层/,
      /流程层/,
      /状态层/,
      /风险层/
    ]
  },
  {
    file: "SKILL.md",
    label: "references use progressive disclosure",
    patterns: [
      /Load references only when needed/,
      /Read `references\/runtime-contract\.md`/,
      /Read `references\/role-contracts\.md`/,
      /Read `references\/action-contracts\.md`/
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
      /Anti-repeat invariant/,
      /execution-shaped/,
      /must not restate/,
      /## Output Level Rule/,
      /Direct conceptual answers are allowed/
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
      /must not self-accept final state/
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
