import { z } from "zod";
import { phaseOwnerSchema } from "./currentPhase.ts";

export const writebackProposalAgentKindSchema = z.enum([
  "external-known",
  "external-unknown",
  "threadsmith-native"
]);

export const writebackProposalStatusSchema = z.enum([
  "proposed",
  "needs-review",
  "rejected",
  "accepted"
]);

export const writebackProposalUpdateSchema = z.object({
  targetPath: z.string().min(1),
  targetPointer: z.string().min(1).nullable(),
  summary: z.string().min(1),
  proposedValue: z.unknown().optional()
});

export const writebackProposalEvidenceSchema = z.object({
  label: z.string().min(1),
  kind: z.enum(["command", "artifact", "diff", "note"]),
  reference: z.string().min(1),
  status: z.enum(["passed", "failed", "unknown"])
});

export const writebackProposalSchema = z.object({
  proposalId: z.string().min(1).regex(/^[a-z0-9][a-z0-9._-]*$/),
  createdAt: z.string().min(1),
  agent: z.object({
    id: z.string().min(1),
    kind: writebackProposalAgentKindSchema,
    provider: z.string().min(1).nullable()
  }),
  role: phaseOwnerSchema,
  phaseName: z.string().min(1),
  summary: z.string().min(1),
  proposedTruthUpdates: z.array(writebackProposalUpdateSchema).min(1),
  evidence: z.array(writebackProposalEvidenceSchema),
  residualRisks: z.array(z.string().min(1)),
  recoverIf: z.array(z.string().min(1)),
  status: writebackProposalStatusSchema
}).superRefine((value, context) => {
  if (
    value.agent.kind !== "threadsmith-native" &&
    value.status === "accepted"
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["status"],
      message: "external agent proposals cannot self-accept committed truth"
    });
  }

  for (const [index, update] of value.proposedTruthUpdates.entries()) {
    if (!update.targetPath.startsWith(".threadsmith/")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["proposedTruthUpdates", index, "targetPath"],
        message: "writeback proposals must target Threadsmith project state"
      });
    }

    if (update.targetPath.includes("/proposals/")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["proposedTruthUpdates", index, "targetPath"],
        message: "writeback proposals cannot propose updates to proposal artifacts"
      });
    }
  }

  const proposesFinalAcceptance = value.proposedTruthUpdates.some(
    (update) =>
      update.targetPath === ".threadsmith/acceptance-state.json" &&
      update.targetPointer?.includes("finalState") &&
      update.proposedValue === "accepted"
  );

  if (proposesFinalAcceptance && value.evidence.length === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["evidence"],
      message: "final acceptance proposals require evidence"
    });
  }

  if (value.recoverIf.length === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["recoverIf"],
      message: "writeback proposals must name at least one recover condition"
    });
  }
});

export type WritebackProposal = z.infer<typeof writebackProposalSchema>;
export type WritebackProposalAgentKind = z.infer<
  typeof writebackProposalAgentKindSchema
>;
export type WritebackProposalEvidence = z.infer<
  typeof writebackProposalEvidenceSchema
>;
export type WritebackProposalStatus = z.infer<
  typeof writebackProposalStatusSchema
>;
export type WritebackProposalUpdate = z.infer<
  typeof writebackProposalUpdateSchema
>;

export function createWritebackProposal(
  proposal: WritebackProposal
): WritebackProposal {
  return writebackProposalSchema.parse(proposal);
}
