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

export type OperatingMode =
  | "light-repair"
  | "normal-implementation"
  | "full-governance";

export type WritebackTier =
  | "evidence-only"
  | "current-context"
  | "committed-truth";

export type RuntimeVerificationLevel = "narrow" | "standard" | "release";

export type OutputBudget = "lite" | "standard" | "audit";

export interface RecommendationMetadata {
  nextStepKind?: NextStepKind;
  operatingMode?: OperatingMode;
  writebackTier?: WritebackTier;
  verificationLevel?: RuntimeVerificationLevel;
  outputBudget?: OutputBudget;
  affectedLayer?: string;
  capabilityTranslation?: string;
}

export interface ActionRecommendation {
  actionId: RuntimeActionId;
  nextStepKind?: NextStepKind;
  operatingMode?: OperatingMode;
  writebackTier?: WritebackTier;
  verificationLevel?: RuntimeVerificationLevel;
  outputBudget?: OutputBudget;
  affectedLayer?: string;
  capabilityTranslation?: string;
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
  metadata?: NextStepKind | RecommendationMetadata
): ActionRecommendation {
  const resolvedMetadata =
    typeof metadata === "string" ? { nextStepKind: metadata } : metadata ?? {};

  return {
    actionId,
    ...resolvedMetadata,
    label,
    reason,
    expectedRoles,
    stopCondition
  };
}
