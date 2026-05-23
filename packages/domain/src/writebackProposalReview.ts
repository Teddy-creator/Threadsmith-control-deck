import { z } from "zod";
import { phaseOwnerSchema } from "./currentPhase.ts";
import {
  writebackProposalSchema,
  writebackProposalUpdateSchema
} from "./writebackProposal.ts";

export const writebackProposalReviewDecisionSchema = z.enum([
  "accept-plan",
  "reject",
  "needs-recovery"
]);

export const writebackProposalReviewEvidenceSchema = z.object({
  label: z.string().min(1),
  reference: z.string().min(1),
  status: z.enum(["checked", "missing", "failed"])
});

export const writebackProposalAdoptionStepSchema = z.object({
  targetPath: z.string().min(1),
  targetPointer: z.string().min(1).nullable(),
  summary: z.string().min(1),
  proposedValue: z.unknown().optional(),
  applyMode: z.enum(["manual-threadsmith-gate"])
});

export const writebackProposalAdoptionPlanSchema = z.object({
  proposalId: z.string().min(1),
  phaseName: z.string().min(1),
  steps: z.array(writebackProposalAdoptionStepSchema).min(1),
  requiresRoles: z.array(phaseOwnerSchema).min(1),
  stopBeforeApply: z.boolean(),
  warning: z.string().min(1)
});

export const writebackProposalReviewSchema = z.object({
  reviewId: z.string().min(1).regex(/^[a-z0-9][a-z0-9._-]*$/),
  proposalId: z.string().min(1),
  reviewedAt: z.string().min(1),
  reviewer: z.object({
    role: z.literal("hygiene").or(z.literal("reviewer")),
    provider: z.string().min(1).nullable()
  }),
  decision: writebackProposalReviewDecisionSchema,
  summary: z.string().min(1),
  evidence: z.array(writebackProposalReviewEvidenceSchema),
  adoptionPlan: writebackProposalAdoptionPlanSchema.nullable(),
  rejectionReasons: z.array(z.string().min(1)),
  recoveryActions: z.array(z.string().min(1)),
  sourceProposal: writebackProposalSchema
}).superRefine((value, context) => {
  if (value.proposalId !== value.sourceProposal.proposalId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["proposalId"],
      message: "review proposalId must match source proposal"
    });
  }

  if (value.decision === "accept-plan") {
    if (!value.adoptionPlan) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["adoptionPlan"],
        message: "accept-plan reviews require an adoption plan"
      });
    }

    if (value.evidence.some((item) => item.status !== "checked")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["evidence"],
        message: "accept-plan reviews require checked evidence"
      });
    }
  }

  if (value.decision === "reject" && value.rejectionReasons.length === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["rejectionReasons"],
      message: "rejected proposal reviews require rejection reasons"
    });
  }

  if (
    value.decision === "needs-recovery" &&
    value.recoveryActions.length === 0
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["recoveryActions"],
      message: "needs-recovery proposal reviews require recovery actions"
    });
  }

  if (value.adoptionPlan) {
    if (value.adoptionPlan.proposalId !== value.sourceProposal.proposalId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["adoptionPlan", "proposalId"],
        message: "adoption plan proposalId must match source proposal"
      });
    }

    if (!value.adoptionPlan.stopBeforeApply) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["adoptionPlan", "stopBeforeApply"],
        message: "adoption plans must stop before applying committed truth"
      });
    }

    for (const [index, step] of value.adoptionPlan.steps.entries()) {
      if (step.applyMode !== "manual-threadsmith-gate") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["adoptionPlan", "steps", index, "applyMode"],
          message: "adoption plan steps must require a manual Threadsmith gate"
        });
      }
    }
  }
});

export type WritebackProposalAdoptionPlan = z.infer<
  typeof writebackProposalAdoptionPlanSchema
>;
export type WritebackProposalReview = z.infer<
  typeof writebackProposalReviewSchema
>;
export type WritebackProposalReviewDecision = z.infer<
  typeof writebackProposalReviewDecisionSchema
>;

export function createManualAdoptionPlan(input: {
  proposalId: string;
  phaseName: string;
  proposedTruthUpdates: z.infer<typeof writebackProposalUpdateSchema>[];
  requiresRoles?: z.infer<typeof phaseOwnerSchema>[];
}): WritebackProposalAdoptionPlan {
  return writebackProposalAdoptionPlanSchema.parse({
    proposalId: input.proposalId,
    phaseName: input.phaseName,
    steps: input.proposedTruthUpdates.map((update) => ({
      ...update,
      applyMode: "manual-threadsmith-gate"
    })),
    requiresRoles: input.requiresRoles ?? ["hygiene", "reviewer"],
    stopBeforeApply: true,
    warning:
      "This adoption plan is not committed truth. Apply only through an explicit Threadsmith gate."
  });
}

export function createWritebackProposalReview(
  review: WritebackProposalReview
): WritebackProposalReview {
  return writebackProposalReviewSchema.parse(review);
}
