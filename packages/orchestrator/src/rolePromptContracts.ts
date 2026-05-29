import type { PhaseOwner } from "@threadsmith/domain";

export function rolePromptContractFor(role: PhaseOwner) {
  switch (role) {
    case "planner":
      return {
        contract: [
          "只允许在当前锁定 phase 内收窄下一条最小 slice。",
          "不要改写 locked phase contract，不要直接修改代码。",
          "如果无法安全继续，使用 pauseRecommendation 而不是硬推。"
        ],
        decisions: ["slice-ready", "pause-recommended"]
      };
    case "executor":
      return {
        contract: [
          "只推进当前 slice，不要扩大范围。",
          "先阅读 committed truth 和必要文件，再开始修改。",
          "完成后如实填写 changedFiles、verification、evidenceRefs。"
        ],
        decisions: ["ready-for-review"]
      };
    case "reviewer":
      return {
        contract: [
          "只判断当前输出能否进入 verification，不要自己补代码。",
          "遇到阻塞时明确指出 blocker 与关键发现。",
          "不要把不确定性包装成通过。"
        ],
        decisions: ["ready-for-verification", "review-blocked"]
      };
    case "verifier":
      return {
        contract: [
          "只根据证据做 verification 结论，不要把缺失证据当成通过。",
          "需要时运行或复核 verification 命令，并如实回填结果。",
          "不要直接给最终 accepted。"
        ],
        decisions: [
          "verification-failed",
          "accepted-with-closeout-pending"
        ]
      };
    case "closeout":
      return {
        contract: [
          "只在 verification 已通过的前提下执行 closeout。",
          "清理临时痕迹、记录 residual risks、补齐必要文档。",
          "不要掩盖尚未解决的问题。"
        ],
        decisions: ["accepted"]
      };
    case "hygiene":
      return {
        contract: [
          "重新锚定 committed truth，区分 verified facts 与 assumptions。",
          "只提出下一步最小动作，不要重开整个任务。",
          "不要伪造验证结论。"
        ],
        decisions: []
      };
  }
}
