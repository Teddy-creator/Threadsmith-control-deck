import {
  createManualAdoptionPlan,
  type WritebackProposal,
  type WritebackProposalReview
} from "@threadsmith/domain";
import { loadProjectState } from "./fileStore.ts";
import { THREADSMITH_DIR } from "./paths.ts";
import { readWritebackProposalArtifact } from "./writebackProposals.ts";
import {
  type WritebackProposalReviewArtifactSummary,
  writeWritebackProposalReviewArtifact
} from "./writebackProposalReviews.ts";

export interface ReviewWritebackProposalOptions {
  reviewedAt?: string;
  reviewerProvider?: string | null;
}

export interface ReviewWritebackProposalResult {
  summary: WritebackProposalReviewArtifactSummary;
  review: WritebackProposalReview;
}

function proposalReference(proposalId: string) {
  return `${THREADSMITH_DIR}/proposals/${proposalId}.json`;
}

function reviewIdFor(proposalId: string) {
  return `review-${proposalId}`;
}

function evidenceForProposal(proposal: WritebackProposal) {
  return [
    {
      label: "proposal artifact checked",
      reference: proposalReference(proposal.proposalId),
      status: "checked" as const
    },
    ...proposal.evidence.map((item) => ({
      label: item.label,
      reference: item.reference,
      status: item.status === "passed" ? ("checked" as const) : ("failed" as const)
    }))
  ];
}

function needsRecoveryReview(input: {
  proposal: WritebackProposal;
  reviewedAt: string;
  reason: string;
  action: string;
  reviewerProvider: string | null;
}): WritebackProposalReview {
  return {
    reviewId: reviewIdFor(input.proposal.proposalId),
    proposalId: input.proposal.proposalId,
    reviewedAt: input.reviewedAt,
    reviewer: {
      role: "hygiene",
      provider: input.reviewerProvider
    },
    decision: "needs-recovery",
    summary: input.reason,
    evidence: evidenceForProposal(input.proposal),
    adoptionPlan: null,
    rejectionReasons: [],
    recoveryActions: [input.action],
    sourceProposal: input.proposal
  };
}

function rejectReview(input: {
  proposal: WritebackProposal;
  reviewedAt: string;
  reason: string;
  reviewerProvider: string | null;
}): WritebackProposalReview {
  return {
    reviewId: reviewIdFor(input.proposal.proposalId),
    proposalId: input.proposal.proposalId,
    reviewedAt: input.reviewedAt,
    reviewer: {
      role: "reviewer",
      provider: input.reviewerProvider
    },
    decision: "reject",
    summary: input.reason,
    evidence: evidenceForProposal(input.proposal),
    adoptionPlan: null,
    rejectionReasons: [input.reason],
    recoveryActions: [],
    sourceProposal: input.proposal
  };
}

function acceptPlanReview(input: {
  proposal: WritebackProposal;
  reviewedAt: string;
  reviewerProvider: string | null;
}): WritebackProposalReview {
  return {
    reviewId: reviewIdFor(input.proposal.proposalId),
    proposalId: input.proposal.proposalId,
    reviewedAt: input.reviewedAt,
    reviewer: {
      role: "hygiene",
      provider: input.reviewerProvider
    },
    decision: "accept-plan",
    summary:
      "Proposal can be adopted through a manual Threadsmith gate; committed truth was not modified.",
    evidence: evidenceForProposal(input.proposal),
    adoptionPlan: createManualAdoptionPlan({
      proposalId: input.proposal.proposalId,
      phaseName: input.proposal.phaseName,
      proposedTruthUpdates: input.proposal.proposedTruthUpdates,
      requiresRoles: ["hygiene", input.proposal.role]
    }),
    rejectionReasons: [],
    recoveryActions: [],
    sourceProposal: input.proposal
  };
}

export async function reviewWritebackProposalArtifact(
  projectRoot: string,
  proposalId: string,
  options: ReviewWritebackProposalOptions = {}
): Promise<ReviewWritebackProposalResult> {
  const reviewedAt = options.reviewedAt ?? new Date().toISOString();
  const reviewerProvider = options.reviewerProvider ?? "codex";
  const proposal = await readWritebackProposalArtifact(projectRoot, proposalId);

  if (!proposal) {
    throw new Error(`Writeback proposal not found: ${proposalReference(proposalId)}`);
  }

  const state = await loadProjectState(projectRoot);
  const currentPhaseName = state.currentPhase.phaseName;

  const review =
    proposal.phaseName !== currentPhaseName
      ? needsRecoveryReview({
          proposal,
          reviewedAt,
          reviewerProvider,
          reason: `Proposal phase "${proposal.phaseName}" does not match current phase "${currentPhaseName}".`,
          action:
            "Run Threadsmith recover/sync before applying this proposal, then regenerate or rebase the proposal."
        })
      : proposal.status !== "proposed" && proposal.status !== "needs-review"
        ? rejectReview({
            proposal,
            reviewedAt,
            reviewerProvider,
            reason: `Proposal status "${proposal.status}" is not reviewable.`
          })
        : proposal.evidence.length === 0 ||
            proposal.evidence.some((item) => item.status !== "passed")
          ? rejectReview({
              proposal,
              reviewedAt,
              reviewerProvider,
              reason:
                "Proposal evidence is missing or not passed; verifier evidence is required before adoption planning."
            })
          : acceptPlanReview({
              proposal,
              reviewedAt,
              reviewerProvider
            });

  const summary = await writeWritebackProposalReviewArtifact(projectRoot, review);

  return {
    summary,
    review
  };
}

