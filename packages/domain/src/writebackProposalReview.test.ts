import { describe, expect, it } from "vitest";
import {
  createManualAdoptionPlan,
  createWritebackProposalReview,
  writebackProposalReviewSchema
} from "./writebackProposalReview.ts";

const proposal = {
  proposalId: "claude-review-1",
  createdAt: "2026-05-23T08:10:00.000Z",
  agent: {
    id: "claude-cli",
    kind: "external-known" as const,
    provider: "claude"
  },
  role: "reviewer" as const,
  phaseName: "Proposal Review / Adoption v1",
  summary: "Reviewer suggests moving the current slice toward verification.",
  proposedTruthUpdates: [
    {
      targetPath: ".threadsmith/acceptance-state.json",
      targetPointer: "/reviewStatus",
      summary: "Mark review ready for verification.",
      proposedValue: "ready-for-verification"
    }
  ],
  evidence: [
    {
      label: "targeted review",
      kind: "note" as const,
      reference: "review notes in current thread",
      status: "passed" as const
    }
  ],
  residualRisks: ["Verification has not run yet."],
  recoverIf: ["Committed truth changed after this proposal was generated."],
  status: "proposed" as const
};

describe("writebackProposalReviewSchema", () => {
  it("creates an accept-plan review without applying committed truth", () => {
    const adoptionPlan = createManualAdoptionPlan({
      proposalId: proposal.proposalId,
      phaseName: proposal.phaseName,
      proposedTruthUpdates: proposal.proposedTruthUpdates
    });

    const review = createWritebackProposalReview({
      reviewId: "review-claude-review-1",
      proposalId: proposal.proposalId,
      reviewedAt: "2026-05-23T09:00:00.000Z",
      reviewer: {
        role: "hygiene",
        provider: "codex"
      },
      decision: "accept-plan",
      summary: "The proposal can be adopted through a manual Threadsmith gate.",
      evidence: [
        {
          label: "proposal evidence checked",
          reference: ".threadsmith/proposals/claude-review-1.json",
          status: "checked"
        }
      ],
      adoptionPlan,
      rejectionReasons: [],
      recoveryActions: [],
      sourceProposal: proposal
    });

    expect(review.adoptionPlan?.stopBeforeApply).toBe(true);
    expect(review.adoptionPlan?.steps[0]?.applyMode).toBe(
      "manual-threadsmith-gate"
    );
    expect(review.adoptionPlan?.warning).toContain("not committed truth");
  });

  it("rejects accept-plan reviews without checked evidence", () => {
    expect(() =>
      writebackProposalReviewSchema.parse({
        reviewId: "review-claude-review-1",
        proposalId: proposal.proposalId,
        reviewedAt: "2026-05-23T09:00:00.000Z",
        reviewer: {
          role: "reviewer",
          provider: "codex"
        },
        decision: "accept-plan",
        summary: "Missing evidence.",
        evidence: [
          {
            label: "proposal evidence",
            reference: ".threadsmith/proposals/claude-review-1.json",
            status: "missing"
          }
        ],
        adoptionPlan: createManualAdoptionPlan({
          proposalId: proposal.proposalId,
          phaseName: proposal.phaseName,
          proposedTruthUpdates: proposal.proposedTruthUpdates
        }),
        rejectionReasons: [],
        recoveryActions: [],
        sourceProposal: proposal
      })
    ).toThrow(/checked evidence/);
  });

  it("requires rejection reasons and recovery actions for non-accept decisions", () => {
    expect(() =>
      writebackProposalReviewSchema.parse({
        reviewId: "review-claude-review-1",
        proposalId: proposal.proposalId,
        reviewedAt: "2026-05-23T09:00:00.000Z",
        reviewer: {
          role: "reviewer",
          provider: "codex"
        },
        decision: "reject",
        summary: "Reject without reason.",
        evidence: [],
        adoptionPlan: null,
        rejectionReasons: [],
        recoveryActions: [],
        sourceProposal: proposal
      })
    ).toThrow(/rejection reasons/);

    expect(() =>
      writebackProposalReviewSchema.parse({
        reviewId: "review-claude-review-1",
        proposalId: proposal.proposalId,
        reviewedAt: "2026-05-23T09:00:00.000Z",
        reviewer: {
          role: "hygiene",
          provider: "codex"
        },
        decision: "needs-recovery",
        summary: "Recovery needed without action.",
        evidence: [],
        adoptionPlan: null,
        rejectionReasons: [],
        recoveryActions: [],
        sourceProposal: proposal
      })
    ).toThrow(/recovery actions/);
  });
});
