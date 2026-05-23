import { mkdtemp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createManualAdoptionPlan } from "@threadsmith/domain";
import {
  readWritebackProposalReviewArtifact,
  writeWritebackProposalReviewArtifact
} from "./writebackProposalReviews.ts";
import { getStatePath, STATE_FILES } from "./paths.ts";

const createdRoots: string[] = [];

async function createProjectRoot() {
  const projectRoot = await mkdtemp(join(tmpdir(), "threadsmith-reviews-"));
  createdRoots.push(projectRoot);
  return projectRoot;
}

const proposal = {
  proposalId: "claude-review-1",
  createdAt: "2026-05-23T08:20:00.000Z",
  agent: {
    id: "claude-cli",
    kind: "external-known" as const,
    provider: "claude"
  },
  role: "reviewer" as const,
  phaseName: "Proposal Review / Adoption v1",
  summary: "Suggest review status update.",
  proposedTruthUpdates: [
    {
      targetPath: ".threadsmith/acceptance-state.json",
      targetPointer: "/reviewStatus",
      summary: "Move review to ready-for-verification.",
      proposedValue: "ready-for-verification"
    }
  ],
  evidence: [
    {
      label: "review note",
      kind: "note" as const,
      reference: "reviewed adapter contract",
      status: "passed" as const
    }
  ],
  residualRisks: ["Verification still needs to run."],
  recoverIf: ["Committed truth changed after proposal generation."],
  status: "proposed" as const
};

const review = {
  reviewId: "review-claude-review-1",
  proposalId: proposal.proposalId,
  reviewedAt: "2026-05-23T09:00:00.000Z",
  reviewer: {
    role: "hygiene" as const,
    provider: "codex"
  },
  decision: "accept-plan" as const,
  summary: "Proposal can be adopted after manual Threadsmith gate.",
  evidence: [
    {
      label: "proposal evidence checked",
      reference: ".threadsmith/proposals/claude-review-1.json",
      status: "checked" as const
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
};

afterEach(async () => {
  await Promise.all(
    createdRoots.splice(0).map((projectRoot) =>
      rm(projectRoot, { recursive: true, force: true })
    )
  );
});

describe("writeback proposal review artifacts", () => {
  it("writes and reads a proposal review without applying committed truth", async () => {
    const projectRoot = await createProjectRoot();

    const summary = await writeWritebackProposalReviewArtifact(projectRoot, review);
    const stored = await readWritebackProposalReviewArtifact(
      projectRoot,
      proposal.proposalId
    );

    expect(summary).toEqual({
      proposalId: "claude-review-1",
      reviewId: "review-claude-review-1",
      decision: "accept-plan",
      relativePath: ".threadsmith/proposal-reviews/claude-review-1.json",
      adoptionPlanReady: true
    });
    expect(stored?.adoptionPlan?.stopBeforeApply).toBe(true);
    expect(
      existsSync(getStatePath(projectRoot, STATE_FILES.acceptanceState))
    ).toBe(false);
  });

  it("rejects unsafe review artifacts before writing", async () => {
    const projectRoot = await createProjectRoot();

    await expect(
      writeWritebackProposalReviewArtifact(projectRoot, {
        ...review,
        adoptionPlan: {
          ...review.adoptionPlan,
          stopBeforeApply: false
        }
      })
    ).rejects.toThrow(/stop before applying/);
  });
});
