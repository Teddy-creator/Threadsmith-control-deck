import { readFile } from "node:fs/promises";
import { join } from "node:path";

const skillDir =
  process.env.THREADSMITH_REPO_SKILL_DIR || join("codex", "skills", "threadsmith");

const checks = [
  {
    file: "SKILL.md",
    label: "short approvals execute instead of repeating recommendations",
    patterns: [
      /Acknowledgement handling has higher priority/,
      /accepted previous recommendation/,
      /same recommendation/
    ]
  },
  {
    file: "SKILL.md",
    label: "operator orientation sections are required",
    patterns: [
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
    label: "project charter decline memory is explicit",
    patterns: [
      /Project Charter Gate/,
      /declines?/i,
      /decline memory/
    ]
  },
  {
    file: "references/action-contracts.md",
    label: "anti-repeat invariant is documented",
    patterns: [
      /Anti-repeat invariant/,
      /execution-shaped/,
      /must not restate/
    ]
  },
  {
    file: "references/runtime-contract.md",
    label: "AGENTS.md first-run and decline behavior is documented",
    patterns: [
      /First-run charter prompt shape/,
      /Operational behavior/,
      /implementation remains blocked/
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
