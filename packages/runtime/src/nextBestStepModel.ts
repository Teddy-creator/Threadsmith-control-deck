export type RuntimeActionId =
  | "advance-phase"
  | "open-current-phase"
  | "run-verification"
  | "sync-context"
  | "run-hygiene"
  | "review-proposal"
  | "create-handoff";

export type NextStepKind =
  | "work-session-continue"
  | "gap-check"
  | "value-heartbeat";

export interface ActionRecommendation {
  actionId: RuntimeActionId;
  nextStepKind?: NextStepKind;
  label: string;
  reason: string;
  expectedRoles: string[];
  stopCondition: string;
}

export interface NextBestStepDecision {
  primary: ActionRecommendation;
  alternatives: [ActionRecommendation, ActionRecommendation];
}

export function recommendation(
  actionId: RuntimeActionId,
  label: string,
  reason: string,
  expectedRoles: string[],
  stopCondition: string,
  nextStepKind?: NextStepKind
): ActionRecommendation {
  return {
    actionId,
    nextStepKind,
    label,
    reason,
    expectedRoles,
    stopCondition
  };
}
