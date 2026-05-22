import { z } from "zod";

export const projectCharterGateLevelSchema = z.enum([
  "pass",
  "warn",
  "fail",
  "bypassed"
]);

export const projectCharterFieldSchema = z.enum([
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
]);

export const projectCharterTaskModeSchema = z.enum([
  "sync",
  "drive",
  "continuous",
  "recover",
  "bootstrap"
]);

export const projectCharterRiskLevelSchema = z.enum([
  "low",
  "medium",
  "high"
]);

export const projectCharterFieldQualitySchema = z.enum([
  "pass",
  "warn",
  "fail"
]);

export const projectCharterFieldAssessmentSchema = z.object({
  field: projectCharterFieldSchema,
  quality: projectCharterFieldQualitySchema,
  reason: z.string().min(1),
  evidence: z.string().min(1).nullable().default(null)
});

export const projectCharterStateSchema = z.object({
  sourcePath: z.string().min(1).nullable().default(null),
  exists: z.boolean().default(false),
  placeholderOnly: z.boolean().default(false),
  stale: z.boolean().default(false),
  missingFields: z.array(projectCharterFieldSchema).default([]),
  fieldAssessments: z.array(projectCharterFieldAssessmentSchema).default([]),
  contradictsThreadsmithTruth: z.boolean().default(false),
  declinedSetup: z.boolean().default(false),
  declineReason: z.string().min(1).nullable().default(null)
});

export const projectCharterGateInputSchema = z.object({
  mode: projectCharterTaskModeSchema,
  riskLevel: projectCharterRiskLevelSchema.default("medium"),
  mutatesSource: z.boolean().default(false),
  destructive: z.boolean().default(false),
  externalSideEffects: z.boolean().default(false),
  userExplicitlyBypassed: z.boolean().default(false),
  charter: projectCharterStateSchema
});

export const projectCharterGateDecisionSchema = z.object({
  level: projectCharterGateLevelSchema,
  canContinue: z.boolean(),
  routeTo: z.enum(["continue", "agents-md-builder", "hygiene"]).nullable(),
  reason: z.string().min(1),
  missingFields: z.array(projectCharterFieldSchema),
  residualRisk: z.string().min(1).nullable().default(null)
});

export type ProjectCharterField = z.infer<typeof projectCharterFieldSchema>;
export type ProjectCharterFieldAssessment = z.infer<
  typeof projectCharterFieldAssessmentSchema
>;
export type ProjectCharterFieldQuality = z.infer<
  typeof projectCharterFieldQualitySchema
>;
export type ProjectCharterGateDecision = z.infer<
  typeof projectCharterGateDecisionSchema
>;
export type ProjectCharterGateInput = z.infer<
  typeof projectCharterGateInputSchema
>;
export type ProjectCharterGateLevel = z.infer<
  typeof projectCharterGateLevelSchema
>;
export type ProjectCharterRiskLevel = z.infer<
  typeof projectCharterRiskLevelSchema
>;
export type ProjectCharterState = z.infer<typeof projectCharterStateSchema>;
export type ProjectCharterTaskMode = z.infer<
  typeof projectCharterTaskModeSchema
>;
