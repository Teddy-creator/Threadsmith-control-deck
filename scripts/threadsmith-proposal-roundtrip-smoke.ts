import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  STATE_FILES,
  adoptWritebackProposalArtifact,
  getStatePath,
  initializeProjectState,
  reviewWritebackProposalArtifact,
  writeStateFragment,
  writeWritebackProposalArtifact
} from "@threadsmith/fs-bridge";

const proposalId = "external-roundtrip-review";

async function main() {
  const projectRoot = await mkdtemp(join(tmpdir(), "threadsmith-proposal-roundtrip-"));

  try {
    await initializeProjectState(projectRoot);
    await writeStateFragment(projectRoot, STATE_FILES.currentPhase, {
      phaseName: "Proposal Round-trip Smoke v1",
      phaseGoal: "Verify external proposal review and explicit adoption.",
      deliverable: "Committed truth update after explicit adoption.",
      inScope: ["Review and adopt one safe proposal."],
      outOfScope: ["Automatic multi-agent dispatch."],
      stopCondition: "Acceptance reviewStatus is updated by adopt-proposal.",
      verificationForThisPhase: ["npm run smoke:proposal-roundtrip"],
      activeOwners: ["hygiene", "reviewer"],
      blockedBy: []
    });
    await writeStateFragment(projectRoot, STATE_FILES.projectStatus, {
      projectLabel: "Proposal Round-trip Smoke",
      currentTrack: "cross-agent bridge",
      overallState: "in-progress",
      currentFocus: "Testing proposal round trip.",
      projectStatusSummary: "Fixture state for proposal round trip.",
      latestAcceptedSlice: null,
      nextPlannedSlice: {
        title: "Proposal Round-trip Smoke v1",
        recordedAt: null
      },
      currentMilestoneId: "bridge-v1",
      nextMilestoneId: null,
      topRisks: [],
      updatedAt: "2026-05-23T08:00:00.000Z"
    });

    await writeWritebackProposalArtifact(projectRoot, {
      proposalId,
      createdAt: "2026-05-23T08:20:00.000Z",
      agent: {
        id: "claude-cli-smoke",
        kind: "external-known",
        provider: "claude"
      },
      role: "reviewer",
      phaseName: "Proposal Round-trip Smoke v1",
      summary: "External reviewer proposes moving review to verification.",
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
          kind: "note",
          reference: "simulated Claude reviewer output",
          status: "passed"
        }
      ],
      residualRisks: ["Verifier has not run yet."],
      recoverIf: ["Committed truth changed after proposal generation."],
      status: "proposed"
    });

    const reviewResult = await reviewWritebackProposalArtifact(
      projectRoot,
      proposalId,
      {
        reviewedAt: "2026-05-23T08:30:00.000Z"
      }
    );

    if (reviewResult.review.decision !== "accept-plan") {
      throw new Error(`Expected accept-plan, got ${reviewResult.review.decision}`);
    }

    const adoptionResult = await adoptWritebackProposalArtifact(
      projectRoot,
      proposalId,
      {
        adoptedAt: "2026-05-23T08:31:00.000Z",
        actor: "threadsmith-smoke"
      }
    );

    const acceptanceState = JSON.parse(
      await readFile(getStatePath(projectRoot, STATE_FILES.acceptanceState), "utf8")
    ) as { reviewStatus?: string };

    if (acceptanceState.reviewStatus !== "ready-for-verification") {
      throw new Error("Proposal adoption did not update committed truth.");
    }

    console.log(
      JSON.stringify(
        {
          mode: "isolated",
          projectRoot,
          proposalId,
          reviewDecision: reviewResult.review.decision,
          adoptedSteps: adoptionResult.appliedSteps.length,
          committedTruthMutation: adoptionResult.committedTruthMutation,
          reviewStatus: acceptanceState.reviewStatus
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
