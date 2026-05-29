import { z } from "zod";
import { currentPhaseSchema, phaseOwnerSchema } from "./currentPhase.ts";

export const phaseRunStatusSchema = z.enum([
  "running",
  "paused",
  "failed",
  "accepted",
  "cancelled"
]);

export const phaseSliceKindSchema = z.enum(["primary", "repair"]);

export const phaseRunPauseTypeSchema = z.enum([
  "risk",
  "blocked",
  "missing-info",
  "loop-limit",
  "infra-failure"
]);

export const phaseRunRecordSchema = z.object({
  phaseRunId: z.string().min(1),
  projectRoot: z.string().min(1),
  status: phaseRunStatusSchema,
  currentRole: phaseOwnerSchema.nullable(),
  currentSliceId: z.string().min(1).nullable(),
  repairCount: z.number().int().min(0),
  lockedPhaseSnapshotRef: z.string().min(1),
  latestSuccessfulRole: phaseOwnerSchema.nullable(),
  pauseReason: z.string().min(1).nullable(),
  resumeHint: z.string().min(1).nullable(),
  workspacePath: z.string().min(1),
  latestRunRef: z.string().min(1).nullable(),
  eventRefs: z.array(z.string().min(1)),
  startedAt: z.string().min(1),
  finishedAt: z.string().min(1).nullable()
});

export const lockedPhaseSnapshotSchema = z.object({
  phaseRunId: z.string().min(1),
  phase: currentPhaseSchema,
  capturedAt: z.string().min(1)
});

export const phaseSliceArtifactSchema = z.object({
  phaseRunId: z.string().min(1),
  sliceId: z.string().min(1),
  kind: phaseSliceKindSchema,
  goal: z.string().min(1),
  scope: z.array(z.string().min(1)).min(1),
  doneWhen: z.array(z.string().min(1)).min(1),
  verification: z.array(z.string().min(1)),
  whyNow: z.string().min(1),
  createdByRunId: z.string().min(1),
  createdAt: z.string().min(1)
});

export const phaseRunPauseSchema = z.object({
  phaseRunId: z.string().min(1),
  type: phaseRunPauseTypeSchema,
  role: phaseOwnerSchema,
  summary: z.string().min(1),
  detail: z.string().min(1),
  resumeRequirements: z.array(z.string().min(1)),
  recommendedPrompt: z.string().min(1),
  createdAt: z.string().min(1)
});

export const phaseRunRoleRuntimeRecordSchema = z.object({
  phaseRunId: z.string().min(1),
  runId: z.string().min(1),
  role: phaseOwnerSchema,
  provider: z.string().min(1),
  sliceId: z.string().min(1).nullable(),
  startedAt: z.string().min(1),
  finishedAt: z.string().min(1),
  durationMs: z.number().int().min(0),
  packetBuildDurationMs: z.number().int().min(0).optional(),
  launchWaitDurationMs: z.number().int().min(0).optional(),
  resultApplyDurationMs: z.number().int().min(0).optional(),
  resultReadDurationMs: z.number().int().min(0).optional(),
  observedBridgeOverheadMs: z.number().int().min(0).optional(),
  contextRefCount: z.number().int().min(0),
  packetEstimatedChars: z.number().int().min(0),
  packetEstimatedTokens: z.number().int().min(0),
  outputSummaryEstimatedChars: z.number().int().min(0),
  outputEstimatedChars: z.number().int().min(0),
  verificationCommandCount: z.number().int().min(0),
  outcome: z.string().min(1),
  decision: z.string().min(1).nullable(),
  repairTrigger: z.string().min(1).nullable()
});

export const phaseRunRoleRuntimeLedgerSchema = z.object({
  phaseRunId: z.string().min(1),
  updatedAt: z.string().min(1),
  records: z.array(phaseRunRoleRuntimeRecordSchema)
});

export const verificationLevelSchema = z.enum(["narrow", "standard", "release"]);

export const verificationPolicyDecisionSchema = z.object({
  recommendedLevel: verificationLevelSchema,
  reason: z.string().min(1),
  reasons: z.array(z.string().min(1)),
  escalationSignals: z.array(z.string().min(1)),
  requiredChecks: z.array(z.string().min(1))
});

export const phaseRunEvidenceBundleSchema = z.object({
  phaseRunId: z.string().min(1),
  generatedAt: z.string().min(1),
  git: z.object({
    status: z.enum(["clean", "dirty", "unknown"]),
    changedFiles: z.array(z.string().min(1)),
    summary: z.string().min(1),
    command: z.string().min(1)
  }),
  phaseRun: z.object({
    status: phaseRunStatusSchema,
    currentRole: phaseOwnerSchema.nullable(),
    currentSliceId: z.string().min(1).nullable(),
    latestRunRef: z.string().min(1).nullable(),
    pauseReason: z.string().min(1).nullable()
  }),
  acceptance: z.object({
    claim: z.string().min(1),
    finalState: z.string().min(1),
    knownGaps: z.array(z.string().min(1)),
    checklist: z.array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        status: z.string().min(1)
      })
    )
  }),
  verification: z.object({
    commands: z.array(z.string().min(1)),
    recommendedLevel: verificationLevelSchema,
    reason: z.string().min(1),
    reasons: z.array(z.string().min(1)),
    escalationSignals: z.array(z.string().min(1)),
    requiredChecks: z.array(z.string().min(1))
  }),
  latestRuns: z.array(
    z.object({
      runId: z.string().min(1),
      role: phaseOwnerSchema,
      status: z.string().min(1),
      outcome: z.string().min(1).nullable(),
      resultPath: z.string().min(1).nullable(),
      summaryPath: z.string().min(1).nullable()
    })
  ),
  staleTruthWarnings: z.array(z.string().min(1))
});

export type LockedPhaseSnapshot = z.infer<typeof lockedPhaseSnapshotSchema>;
export type PhaseRunPause = z.infer<typeof phaseRunPauseSchema>;
export type PhaseRunPauseType = z.infer<typeof phaseRunPauseTypeSchema>;
export type PhaseRunRecord = z.infer<typeof phaseRunRecordSchema>;
export type PhaseRunStatus = z.infer<typeof phaseRunStatusSchema>;
export type PhaseSliceArtifact = z.infer<typeof phaseSliceArtifactSchema>;
export type PhaseSliceKind = z.infer<typeof phaseSliceKindSchema>;
export type PhaseRunRoleRuntimeLedger = z.infer<
  typeof phaseRunRoleRuntimeLedgerSchema
>;
export type PhaseRunRoleRuntimeRecord = z.infer<
  typeof phaseRunRoleRuntimeRecordSchema
>;
export type PhaseRunEvidenceBundle = z.infer<
  typeof phaseRunEvidenceBundleSchema
>;
export type VerificationLevel = z.infer<typeof verificationLevelSchema>;
export type VerificationPolicyDecision = z.infer<
  typeof verificationPolicyDecisionSchema
>;
