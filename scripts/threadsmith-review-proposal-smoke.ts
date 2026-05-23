import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  STATE_FILES,
  getStatePath,
  initializeProjectState,
  readWritebackProposalReviewArtifact,
  reviewWritebackProposalArtifact,
  writeStateFragment,
  writeWritebackProposalArtifact
} from "@threadsmith/fs-bridge";

const proposalId = "proposal-review-smoke";

async function main() {
  const projectRoot = await mkdtemp(join(tmpdir(), "threadsmith-review-proposal-smoke-"));

  try {
    await initializeProjectState(projectRoot);
    await writeStateFragment(projectRoot, STATE_FILES.currentPhase, {
      phaseName: "Proposal Review Workflow Smoke v1",
      phaseGoal: "Review one proposal without applying committed truth.",
      deliverable: "Proposal review artifact.",
      inScope: ["Review proposal artifact."],
      outOfScope: ["Apply committed truth automatically."],
      stopCondition: "Review artifact exists and committed truth is unchanged.",
      verificationForThisPhase: ["npm run smoke:review-proposal"],
      activeOwners: ["hygiene", "reviewer"],
      blockedBy: []
    });

    await writeWritebackProposalArtifact(projectRoot, {
      proposalId,
      createdAt: "2026-05-23T12:40:00.000Z",
      agent: {
        id: "external-agent-smoke",
        kind: "external-known",
        provider: "generic-agent"
      },
      role: "reviewer",
      phaseName: "Proposal Review Workflow Smoke v1",
      summary: "External agent proposes a review status update.",
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
          reference: "simulated external agent review",
          status: "passed"
        }
      ],
      residualRisks: ["Verification still needs to run."],
      recoverIf: ["Committed truth changed after the proposal was generated."],
      status: "proposed"
    });

    const result = await reviewWritebackProposalArtifact(projectRoot, proposalId, {
      reviewedAt: "2026-05-23T12:41:00.000Z"
    });
    const storedReview = await readWritebackProposalReviewArtifact(
      projectRoot,
      proposalId
    );

    if (!storedReview?.adoptionPlan?.stopBeforeApply) {
      throw new Error("proposal review did not preserve stopBeforeApply.");
    }

    const acceptanceContents = await readFile(
      getStatePath(projectRoot, STATE_FILES.acceptanceState),
      "utf8"
    );

    if (acceptanceContents.includes("ready-for-verification")) {
      throw new Error("proposal review unexpectedly modified committed truth.");
    }

    console.log(
      JSON.stringify(
        {
          mode: "isolated",
          projectRoot,
          proposalId,
          decision: result.review.decision,
          relativePath: result.summary.relativePath,
          adoptionPlanReady: result.summary.adoptionPlanReady,
          committedTruthMutation: "none",
          applyMode: storedReview.adoptionPlan.steps[0]?.applyMode ?? null
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

