import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createManualAdoptionPlan } from "@threadsmith/domain";
import { getProposalsDir } from "./paths.ts";
import { summarizeProposalVisibility } from "./proposalVisibility.ts";
import { writeWritebackProposalReviewArtifact } from "./writebackProposalReviews.ts";
import { writeWritebackProposalArtifact } from "./writebackProposals.ts";

const createdRoots: string[] = [];

async function createProjectRoot() {
  const projectRoot = await mkdtemp(join(tmpdir(), "threadsmith-proposal-visibility-"));
  createdRoots.push(projectRoot);
  return projectRoot;
}

function proposal(proposalId: string) {
  return {
    proposalId,
    createdAt: "2026-05-23T14:20:00.000Z",
    agent: {
      id: "claude-reviewer",
      kind: "external-known" as const,
      provider: "claude"
    },
    role: "reviewer" as const,
    phaseName: "Proposal Visibility v1",
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
        reference: "reviewed proposal visibility",
        status: "passed" as const
      }
    ],
    residualRisks: ["Verification still needs to run."],
    recoverIf: ["Committed truth changed after proposal generation."],
    status: "proposed" as const
  };
}

afterEach(async () => {
  await Promise.all(
    createdRoots.splice(0).map((projectRoot) =>
      rm(projectRoot, { recursive: true, force: true })
    )
  );
});

describe("summarizeProposalVisibility", () => {
  it("classifies pending, reviewed, and invalid proposal artifacts", async () => {
    const projectRoot = await createProjectRoot();
    const pending = proposal("pending-claude-review");
    const reviewed = proposal("reviewed-claude-review");

    await writeWritebackProposalArtifact(projectRoot, pending);
    await writeWritebackProposalArtifact(projectRoot, reviewed);
    await writeWritebackProposalReviewArtifact(projectRoot, {
      reviewId: "review-reviewed-claude-review",
      proposalId: reviewed.proposalId,
      reviewedAt: "2026-05-23T14:21:00.000Z",
      reviewer: {
        role: "hygiene",
        provider: "codex"
      },
      decision: "accept-plan",
      summary: "Proposal can be manually adopted.",
      evidence: [
        {
          label: "proposal checked",
          reference: ".threadsmith/proposals/reviewed-claude-review.json",
          status: "checked"
        }
      ],
      adoptionPlan: createManualAdoptionPlan({
        proposalId: reviewed.proposalId,
        phaseName: reviewed.phaseName,
        proposedTruthUpdates: reviewed.proposedTruthUpdates
      }),
      rejectionReasons: [],
      recoveryActions: [],
      sourceProposal: reviewed
    });

    await mkdir(getProposalsDir(projectRoot), { recursive: true });
    await writeFile(
      join(getProposalsDir(projectRoot), "invalid-proposal.json"),
      "{ invalid json",
      "utf8"
    );

    const summary = await summarizeProposalVisibility(projectRoot);

    expect(summary.counts).toEqual({
      pending: 1,
      reviewed: 1,
      invalid: 1,
      total: 3
    });
    expect(summary.items.find((item) => item.proposalId === pending.proposalId)).toMatchObject({
      status: "pending",
      recommendedAction:
        "npm run threadsmith:review-proposal -- . pending-claude-review"
    });
    expect(summary.items.find((item) => item.proposalId === reviewed.proposalId)).toMatchObject({
      status: "reviewed",
      reviewDecision: "accept-plan",
      reviewPath: ".threadsmith/proposal-reviews/reviewed-claude-review.json"
    });
    expect(summary.items.find((item) => item.proposalId === "invalid-proposal")).toMatchObject({
      status: "invalid"
    });
  });

  it("returns an empty summary when no proposals exist", async () => {
    const projectRoot = await createProjectRoot();

    const summary = await summarizeProposalVisibility(projectRoot);

    expect(summary.counts.total).toBe(0);
    expect(summary.detail).toBe("No writeback proposals found.");
  });
});
