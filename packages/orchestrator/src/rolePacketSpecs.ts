import type {
  CurrentPhase,
  PhaseOwner,
  ProjectState
} from "@threadsmith/domain";
import { decidePlannerMode, type PlannerMode } from "./plannerMode.ts";

function phaseScope(phase: CurrentPhase) {
  return phase.inScope.length > 0 ? phase.inScope : [phase.deliverable];
}

function acceptanceDoneWhen(
  phase: CurrentPhase,
  acceptance: ProjectState["acceptanceState"]
) {
  return acceptance.doneWhenChecklist.length > 0
    ? acceptance.doneWhenChecklist.map((item) => item.label)
    : [phase.stopCondition];
}

function plannerSliceKindForMode(mode: PlannerMode) {
  return mode === "planner-reset" ? "repair" : "primary";
}

function plannerDoneWhen(mode: PlannerMode) {
  const sliceKind = plannerSliceKindForMode(mode);

  if (mode === "planning-phase") {
    return [
      "产出当前 planning phase 要求的计划、边界或 brief",
      "明确下一步是否可以进入 executor，还是需要 operator 审核",
      "如果当前真相不足以安全继续，则改为给出 pause recommendation"
    ];
  }

  if (mode === "planner-lite") {
    return [
      "只收窄下一条最小 slice，不重新规划整个项目",
      "明确 slice 的 scope、done when 与 verification",
      "如果当前真相不足以安全继续，则改为给出 pause recommendation"
    ];
  }

  return [
    `产出一条不超出当前 phase 的 ${sliceKind} slice 建议`,
    "明确 slice 的 scope、done when 与 verification",
    "如果当前真相不足以安全继续，则改为给出 pause recommendation"
  ];
}

function buildPlannerObjective(
  phaseGoal: string,
  mode: PlannerMode,
  reason: string
) {
  switch (mode) {
    case "planning-phase":
      return `Planner mode: planning-phase。当前 phase 的交付物就是计划/边界/brief；请完成该 planning deliverable，而不是直接写实现。原因：${reason} 当前 phase goal：${phaseGoal}`;
    case "planner-reset":
      return `Planner mode: planner-reset。为当前锁定 phase 收束下一条 repair slice，并基于失败或阻塞信号缩小范围。原因：${reason} 当前 phase goal：${phaseGoal}`;
    case "planner-lite":
      return `Planner mode: planner-lite。只为当前锁定 phase 收窄下一条最小 slice，不重新规划整个项目。原因：${reason} 当前 phase goal：${phaseGoal}`;
    case "direct-executor":
      return `Planner mode: direct-executor。当前 truth 已指向后续执行角色；只有在被显式调用为 planner 时才重新校准。原因：${reason} 当前 phase goal：${phaseGoal}`;
  }
}

export interface RolePacketSpec {
  role: PhaseOwner;
  objective: string;
  scope: string[];
  doneWhen: string[];
  verification: string[];
}

export function buildRolePacketSpec(input: {
  role: PhaseOwner;
  state: ProjectState;
}): RolePacketSpec {
  const phase = input.state.currentPhase;
  const acceptance = input.state.acceptanceState;

  switch (input.role) {
    case "planner": {
      const mode = decidePlannerMode(input.state);

      return {
        role: "planner",
        objective: buildPlannerObjective(
          phase.phaseGoal,
          mode.mode,
          mode.reason
        ),
        scope: phaseScope(phase),
        doneWhen: plannerDoneWhen(mode.mode),
        verification: []
      };
    }
    case "executor":
      return {
        role: "executor",
        objective: phase.phaseGoal,
        scope: phaseScope(phase),
        doneWhen: acceptanceDoneWhen(phase, acceptance),
        verification: phase.verificationForThisPhase
      };
    case "reviewer":
      return {
        role: "reviewer",
        objective: "复核当前 slice 输出是否符合 Project Brief、当前 phase 与当前 claim。",
        scope: [
          "检查当前输出是否仍在 locked phase 范围内",
          "判断当前结果是否可以进入 verification"
        ],
        doneWhen: [
          "只给出 ready-for-verification 或 review-blocked",
          "如果阻塞，明确 blocker 与关键发现"
        ],
        verification: []
      };
    case "verifier":
      return {
        role: "verifier",
        objective: "独立检查当前 claim 是否已被证据支持，并给出 verification 结论。",
        scope: [
          "复核当前 claim 与 done when",
          "检查已有证据是否足够支撑通过"
        ],
        doneWhen: [
          "只给出 verification-failed 或 accepted-with-closeout-pending",
          "如果失败，明确证据缺口或失败命令"
        ],
        verification: phase.verificationForThisPhase
      };
    case "closeout":
      return {
        role: "closeout",
        objective: "对当前已通过 verification 的结果做收尾，准备 accepted 状态。",
        scope: [
          "清理临时调试痕迹",
          "记录 residual risks 与必要文档更新"
        ],
        doneWhen: [
          "说明完成了哪些 closeout 动作",
          "只在可以安全收尾时给出 accepted"
        ],
        verification: []
      };
    case "hygiene":
      return {
        role: "hygiene",
        objective: "清理会话惯性，重新锚定 committed truth，并给出下一步最小动作。",
        scope: [
          "区分 verified facts、assumptions、stale inferences",
          "给出当前最小可继续动作"
        ],
        doneWhen: ["产出一份可信的 session hygiene 结果"],
        verification: []
      };
  }
}
