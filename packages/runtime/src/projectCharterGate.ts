import type {
  ProjectCharterField,
  ProjectCharterGateDecision,
  ProjectCharterGateInput,
  ProjectCharterState
} from "@threadsmith/domain";
import {
  projectCharterGateDecisionSchema,
  projectCharterGateInputSchema
} from "@threadsmith/domain";

const REQUIRED_FIELDS: ProjectCharterField[] = [
  "purpose",
  "goals",
  "nonGoals",
  "repositoryMap",
  "commands",
  "architectureBoundaries",
  "riskRules",
  "humanConfirmationGates",
  "definitionOfDone",
  "verification"
];

function uniqueFields(fields: ProjectCharterField[]) {
  return [...new Set(fields)];
}

function requiredMissingFields(charter: ProjectCharterState) {
  if (!charter.exists || charter.placeholderOnly) {
    return REQUIRED_FIELDS;
  }

  return uniqueFields(charter.missingFields);
}

function warningFields(charter: ProjectCharterState) {
  return charter.fieldAssessments
    .filter((assessment) => assessment.quality === "warn")
    .map((assessment) => assessment.field);
}

function formatWarningRisk(fields: ProjectCharterField[]) {
  if (fields.length === 0) {
    return null;
  }

  return `Project constitution has thin guidance for: ${uniqueFields(fields).join(", ")}.`;
}

function isReadOnlySync(input: ProjectCharterGateInput) {
  return (
    input.mode === "sync" &&
    !input.mutatesSource &&
    !input.destructive &&
    !input.externalSideEffects
  );
}

function isSafeExplicitBypass(input: ProjectCharterGateInput) {
  return (
    input.userExplicitlyBypassed &&
    input.riskLevel === "low" &&
    !input.mutatesSource &&
    !input.destructive &&
    !input.externalSideEffects
  );
}

function decision(input: ProjectCharterGateDecision) {
  return projectCharterGateDecisionSchema.parse(input);
}

export function evaluateProjectCharterGate(
  rawInput: ProjectCharterGateInput
): ProjectCharterGateDecision {
  const input = projectCharterGateInputSchema.parse(rawInput);
  const missingFields = requiredMissingFields(input.charter);
  const warningRisk = formatWarningRisk(warningFields(input.charter));

  if (input.charter.contradictsThreadsmithTruth) {
    return decision({
      level: "fail",
      canContinue: false,
      routeTo: "hygiene",
      reason: "AGENTS.md contradicts committed Threadsmith truth.",
      missingFields,
      residualRisk: null
    });
  }

  if (isSafeExplicitBypass(input)) {
    return decision({
      level: "bypassed",
      canContinue: true,
      routeTo: "continue",
      reason: "User explicitly bypassed Project Charter Gate for low-risk read-only work.",
      missingFields,
      residualRisk: "Project constitution is not confirmed; do not start implementation."
    });
  }

  if (input.charter.declinedSetup && isReadOnlySync(input)) {
    return decision({
      level: "warn",
      canContinue: true,
      routeTo: "continue",
      reason: "User previously declined AGENTS.md setup; read-only sync may continue without repeating the setup prompt.",
      missingFields,
      residualRisk: "Implementation should not start until project constitution is confirmed."
    });
  }

  if (input.charter.declinedSetup && !isReadOnlySync(input)) {
    return decision({
      level: "fail",
      canContinue: false,
      routeTo: "agents-md-builder",
      reason: "User previously declined AGENTS.md setup; execution-like work must wait for project constitution confirmation.",
      missingFields,
      residualRisk: null
    });
  }

  if (!input.charter.exists) {
    if (isReadOnlySync(input)) {
      return decision({
        level: "warn",
        canContinue: true,
        routeTo: "continue",
        reason: "AGENTS.md is missing; read-only sync may continue but implementation must route to agents-md-builder first.",
        missingFields,
        residualRisk: "No durable project constitution is available."
      });
    }

    return decision({
      level: "fail",
      canContinue: false,
      routeTo: "agents-md-builder",
      reason: "AGENTS.md is missing.",
      missingFields,
      residualRisk: null
    });
  }

  if (input.charter.placeholderOnly || missingFields.length > 0) {
    if (isReadOnlySync(input)) {
      return decision({
        level: "warn",
        canContinue: true,
        routeTo: "continue",
        reason: "AGENTS.md is incomplete; read-only sync may continue but implementation should repair the project charter first.",
        missingFields,
        residualRisk: "Project constitution may not constrain future edits."
      });
    }

    return decision({
      level: "fail",
      canContinue: false,
      routeTo: "agents-md-builder",
      reason: input.charter.placeholderOnly
        ? "AGENTS.md is placeholder-only."
        : "AGENTS.md is missing required durable guidance.",
      missingFields,
      residualRisk: null
    });
  }

  if (input.charter.stale) {
    if (isReadOnlySync(input)) {
      return decision({
        level: "warn",
        canContinue: true,
        routeTo: "continue",
        reason: "AGENTS.md may be stale; read-only sync may continue while reporting the risk.",
        missingFields,
        residualRisk: "Project rules may lag current repo reality."
      });
    }

    return decision({
      level: "fail",
      canContinue: false,
      routeTo: "hygiene",
      reason: "AGENTS.md appears stale relative to repo truth.",
      missingFields,
      residualRisk: null
    });
  }

  return decision({
    level: "pass",
    canContinue: true,
    routeTo: "continue",
    reason: warningRisk
      ? "Project Charter Gate passed with thin guidance warnings."
      : "Project Charter Gate passed.",
    missingFields,
    residualRisk: warningRisk
  });
}
