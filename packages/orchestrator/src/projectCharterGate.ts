import type {
  ProjectCharterGateDecision,
  ProjectCharterRiskLevel,
  ProjectCharterTaskMode
} from "@threadsmith/domain";
import { inspectProjectCharter } from "@threadsmith/fs-bridge";
import { evaluateProjectCharterGate } from "@threadsmith/runtime";

export class ProjectCharterGateError extends Error {
  constructor(readonly decision: ProjectCharterGateDecision) {
    super(`Project Charter Gate blocked execution: ${decision.reason}`);
    this.name = "ProjectCharterGateError";
  }
}

export interface AssertProjectCharterGateInput {
  projectRoot: string;
  mode: ProjectCharterTaskMode;
  riskLevel?: ProjectCharterRiskLevel;
  mutatesSource?: boolean;
  destructive?: boolean;
  externalSideEffects?: boolean;
  userExplicitlyBypassed?: boolean;
}

export async function assertProjectCharterGate(
  input: AssertProjectCharterGateInput
) {
  const charter = await inspectProjectCharter(input.projectRoot);
  const decision = evaluateProjectCharterGate({
    mode: input.mode,
    riskLevel: input.riskLevel ?? "medium",
    mutatesSource: input.mutatesSource ?? false,
    destructive: input.destructive ?? false,
    externalSideEffects: input.externalSideEffects ?? false,
    userExplicitlyBypassed: input.userExplicitlyBypassed ?? false,
    charter
  });

  if (!decision.canContinue) {
    throw new ProjectCharterGateError(decision);
  }

  return decision;
}
