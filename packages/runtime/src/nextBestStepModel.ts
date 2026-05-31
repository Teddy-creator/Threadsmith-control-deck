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

export type OutputShape = "progress-card" | "audit-skeleton" | "compact";

export type RolePacketPolicy = "skip-daily" | "refresh-durable";

export type WritebackStatusVisibility = "omit" | "optional" | "required";

export type SurfaceAudience =
  | "internal"
  | "developer"
  | "operator"
  | "user_public";

export type WorkVisibility =
  | "internal"
  | "developer_visible"
  | "operator_visible"
  | "user_visible";

export interface RecommendationMetadata {
  nextStepKind?: NextStepKind;
  operatingMode?: OperatingMode;
  writebackTier?: WritebackTier;
  verificationLevel?: RuntimeVerificationLevel;
  outputBudget?: OutputBudget;
  outputShape?: OutputShape;
  rolePacketPolicy?: RolePacketPolicy;
  writebackStatusVisibility?: WritebackStatusVisibility;
  surfaceAudience?: SurfaceAudience;
  workVisibility?: WorkVisibility;
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
  outputShape?: OutputShape;
  rolePacketPolicy?: RolePacketPolicy;
  writebackStatusVisibility?: WritebackStatusVisibility;
  surfaceAudience?: SurfaceAudience;
  workVisibility?: WorkVisibility;
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
