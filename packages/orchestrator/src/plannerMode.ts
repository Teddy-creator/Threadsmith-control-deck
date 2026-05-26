import type { PhaseOwner, ProjectState } from "@threadsmith/domain";

export type PlannerMode =
  | "planning-phase"
  | "planner-reset"
  | "planner-lite"
  | "direct-executor";

export interface PlannerModeDecision {
  mode: PlannerMode;
  startRole: PhaseOwner;
  reason: string;
}

const PLANNING_KEYWORDS = [
  "plan",
  "planning",
  "brief",
  "proposal",
  "design",
  "方案",
  "计划",
  "规划",
  "文档",
  "设计",
  "边界"
];

function phaseText(state: ProjectState) {
  return [
    state.currentPhase.phaseName,
    state.currentPhase.phaseGoal,
    state.currentPhase.deliverable,
    state.currentPhase.stopCondition,
    ...state.currentPhase.inScope
  ].join(" ").toLowerCase();
}

function isPlanningPhase(state: ProjectState) {
  const text = phaseText(state);

  return (
    state.currentPhase.activeOwners.length === 1 &&
    state.currentPhase.activeOwners[0] === "planner"
  ) || PLANNING_KEYWORDS.some((keyword) => text.includes(keyword));
}

export function decidePlannerMode(state: ProjectState): PlannerModeDecision {
  if (
    state.acceptanceState.closeoutStatus === "pending" ||
    state.acceptanceState.finalState === "accepted-with-closeout-pending"
  ) {
    return {
      mode: "direct-executor",
      startRole: "closeout",
      reason: "Acceptance truth indicates verification has passed and closeout is pending."
    };
  }

  if (
    state.acceptanceState.reviewStatus === "ready-for-verification" ||
    state.acceptanceState.finalState === "ready-for-verification"
  ) {
    return {
      mode: "direct-executor",
      startRole: "verifier",
      reason: "Acceptance truth indicates review is complete and verification is next."
    };
  }

  if (
    state.acceptanceState.implementationStatus === "ready-for-review" ||
    state.acceptanceState.finalState === "ready-for-review"
  ) {
    return {
      mode: "direct-executor",
      startRole: "reviewer",
      reason: "Acceptance truth indicates implementation is ready for review."
    };
  }

  if (
    state.currentPhase.blockedBy.length > 0 ||
    state.acceptanceState.reviewStatus === "review-blocked" ||
    state.acceptanceState.verificationStatus === "failed" ||
    state.acceptanceState.finalState === "review-blocked" ||
    state.acceptanceState.finalState === "verification-failed"
  ) {
    return {
      mode: "planner-reset",
      startRole: "planner",
      reason: "Current truth contains a blocker or failed gate; planner must re-anchor before execution."
    };
  }

  if (
    state.currentPhase.activeOwners[0] === "executor" &&
    !isPlanningPhase(state)
  ) {
    return {
      mode: "direct-executor",
      startRole: "executor",
      reason: "Current phase explicitly starts with executor and does not look like a planning deliverable."
    };
  }

  if (isPlanningPhase(state)) {
    return {
      mode: "planning-phase",
      startRole: "planner",
      reason: "Current phase deliverable is planning-shaped, so planner is the actual deliverable owner."
    };
  }

  return {
    mode: "planner-lite",
    startRole: "planner",
    reason: "Current phase needs only narrow slice tightening before execution."
  };
}
