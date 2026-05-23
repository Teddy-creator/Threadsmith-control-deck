import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createManualAdoptionPlan } from "@threadsmith/domain";
import {
  getProposalsDir,
  summarizeProposalVisibility,
  writeWritebackProposalArtifact,
  writeWritebackProposalReviewArtifact
} from "@threadsmith/fs-bridge";

function proposal(proposalId: string) {
  return {
    proposalId,
    createdAt: "2026-05-23T14:30:00.000Z",
    agent: {
      id: "external-reviewer-smoke",
      kind: "external-known" as const,
      provider: "claude"
    },
    role: "reviewer" as const,
    phaseName: "Proposal Status Smoke v1",
    summary: "External reviewer proposes a status update.",
    proposedTruthUpdates: [
      {
        targetPath: ".threadsmith/acceptance-state.json",
        targetPointer: "/reviewStatus",
        summary: "Move review status to ready-for-verification.",
        proposedValue: "ready-for-verification"
      }
    ],
    evidence: [
      {
        label: "external review note",
        kind: "note" as const,
        reference: "simulated external review",
        status: "passed" as const
      }
    ],
    residualRisks: ["Verification still needs to run."],
    recoverIf: ["Committed truth changed after proposal generation."],
    status: "proposed" as const
  };
}

async function main() {
  const projectRoot = await mkdtemp(join(tmpdir(), "threadsmith-proposal-status-smoke-"));

  try {
    const pending = proposal("pending-claude-review");
    const reviewed = proposal("reviewed-claude-review");

    await writeWritebackProposalArtifact(projectRoot, pending);
    await writeWritebackProposalArtifact(projectRoot, reviewed);
    await writeWritebackProposalReviewArtifact(projectRoot, {
      reviewId: "review-reviewed-claude-review",
      proposalId: reviewed.proposalId,
      reviewedAt: "2026-05-23T14:31:00.000Z",
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

    if (
      summary.counts.pending !== 1 ||
      summary.counts.reviewed !== 1 ||
      summary.counts.invalid !== 1 ||
      summary.counts.total !== 3
    ) {
      throw new Error(`Unexpected proposal visibility counts: ${summary.detail}`);
    }

    const pendingItem = summary.items.find(
      (item) => item.proposalId === pending.proposalId
    );
    if (!pendingItem?.recommendedAction.includes("threadsmith:review-proposal")) {
      throw new Error("Pending proposal did not include the review command.");
    }

    console.log(
      JSON.stringify(
        {
          mode: "isolated",
          projectRoot,
          counts: summary.counts,
          pendingAction: pendingItem.recommendedAction,
          invalidHandledWithoutCrash: true
        },
        null,
        2
      )
    );
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
