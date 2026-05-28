export type RuntimeActionId =
  | "advance-phase"
  | "open-current-phase"
  | "run-verification"
  | "sync-context"
  | "run-hygiene"
  | "review-proposal"
  | "create-handoff";

export interface ActionRecommendation {
  actionId: RuntimeActionId;
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
  stopCondition: string
): ActionRecommendation {
  return {
    actionId,
    label,
    reason,
    expectedRoles,
    stopCondition
  };
}
